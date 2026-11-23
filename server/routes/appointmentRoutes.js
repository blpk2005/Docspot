const express = require("express");
const router = express.Router();

const Appointment = require("../models/appointmentModel");
const Doctor = require("../models/doctorModel");
const User = require("../models/userModel");
const authMiddleware = require("../middleware/authMiddleware");

// ================= MULTER CONFIG =================
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only document and image files (.pdf, .jpg, .png, .doc, .docx) are allowed."));
    }
  },
});

// Middleware to handle multer upload errors cleanly
const handleUpload = (req, res, next) => {
  upload.single("document")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).send("File too large. Maximum size is 10MB.");
        }
        return res.status(400).send(`File upload error: ${err.message}`);
      }
      return res.status(400).send(err.message || "File upload failed.");
    }
    next();
  });
};

// ================= BOOK APPOINTMENT =================
router.post(
  "/book-appointment",
  handleUpload,  // multer FIRST — populates req.body before auth reads it
  authMiddleware,
  async (req, res) => {
    try {
      // Restrict doctors from booking appointments
      const user = await User.findById(req.body.userId);
      if (!user) {
        return res.status(404).send("User not found");
      }
      if (user.isDoctor) {
        return res.status(403).send("Doctors are not permitted to book appointments.");
      }

      const newAppointment = new Appointment({
        userId: req.body.userId,
        doctorId: req.body.doctorId,
        date: req.body.date,
        document: req.file ? req.file.filename : null,
        status: "pending",
      });

      await newAppointment.save();

      // Notify doctor (non-fatal)
      try {
        const doctor = await Doctor.findById(req.body.doctorId);
        if (doctor) {
          const doctorUser = await User.findById(doctor.userId);
          if (doctorUser) {
            doctorUser.notifications.push({
              type: "appointment-request",
              message: "New appointment request received",
            });
            await doctorUser.save();
          }
        }
      } catch (notifyErr) {
        console.error("Doctor notification failed (non-fatal):", notifyErr.message);
      }

      res.send("Appointment booked successfully");
    } catch (error) {
      console.error("Booking error:", error.message);
      res.status(500).send("Booking failed");
    }
  }
);

// ================= USER APPOINTMENTS =================
router.post("/user-appointments", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      userId: req.body.userId,
    });
    res.send(appointments);
  } catch (error) {
    res.status(500).send("Error fetching appointments");
  }
});

// ================= DOCTOR OWN APPOINTMENTS (by JWT userId) =================
router.get("/my-appointments", authMiddleware, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.body.userId });
    if (!doctor) return res.status(404).send("Doctor profile not found.");

    const appointments = await Appointment.find({
      $or: [{ doctorId: doctor._id.toString() }, { doctorId: doctor._id }],
    }).sort({ _id: -1 });

    // Collect patient info for these appointments only
    const patientUserIds = [...new Set(appointments.map((a) => a.userId).filter(Boolean))];
    const patients = await User.find({ _id: { $in: patientUserIds } }).select("name email phone");
    const patientsMap = {};
    patients.forEach((p) => {
      patientsMap[p._id.toString()] = {
        name: p.name,
        email: p.email,
        phone: p.phone,
      };
    });

    res.send({ doctor, appointments, patientsMap });
  } catch (error) {
    console.error("my-appointments error:", error.message);
    res.status(500).send("Error fetching appointments");
  }
});

// ================= DOCTOR APPOINTMENTS (by doctorId param) =================
router.get(
  "/doctor-appointments/:doctorId",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.body.userId);
      if (!user) return res.status(401).send("Unauthorized");

      // Only Admin or the assigned doctor can view this doctor's appointments
      if (!user.isAdmin) {
        const doctor = await Doctor.findOne({ userId: req.body.userId });
        if (!doctor || doctor._id.toString() !== req.params.doctorId) {
          return res.status(403).send("Forbidden: You can only view your own appointments");
        }
      }

      const appointments = await Appointment.find({
        $or: [{ doctorId: req.params.doctorId }, { doctorId: req.params.doctorId.toString() }],
      }).sort({ _id: -1 });
      res.send(appointments);
    } catch (error) {
      res.status(500).send("Error fetching doctor appointments");
    }
  }
);

// ================= UPDATE STATUS =================
router.post("/update-status", authMiddleware, async (req, res) => {
  try {
    const { appointmentId, status } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).send("Appointment not found");

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(401).send("Unauthorized");

    if (!user.isAdmin) {
      const doctor = await Doctor.findOne({ userId: req.body.userId });
      const isAssignedDoctor = doctor && (appointment.doctorId === doctor._id.toString() || String(appointment.doctorId) === String(doctor._id));
      const isPatient = appointment.userId === req.body.userId;

      if (isPatient) {
        if (status !== "cancelled") {
          return res.status(403).send("Patients can only cancel appointments");
        }
      } else if (!isAssignedDoctor) {
        return res.status(403).send("You can only update appointments assigned to you");
      }
    }

    appointment.status = status;
    await appointment.save();

    const patientUser = await User.findById(appointment.userId);
    if (patientUser) {
      patientUser.notifications.push({
        type: "appointment-status",
        message: `Your appointment has been ${status}`,
      });
      await patientUser.save();
    }

    res.send("Appointment updated");
  } catch (error) {
    res.status(500).send("Error updating appointment");
  }
});

// ================= EXPORT =================
module.exports = router;