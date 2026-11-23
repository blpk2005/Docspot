const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

// ── CORS ─────────────────────────────────────────────────────────
const corsOptions = {
  origin: true, // Allow requests from any origin (localhost, live Render domains, etc.)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200, // some browsers (IE11) choke on 204
};

app.use(cors(corsOptions));

// Handle ALL preflight OPTIONS requests immediately
app.options("/{*splat}", cors(corsOptions));

// ── BODY PARSING ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── ROUTES ───────────────────────────────────────────────────────
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));

// ── STATIC FILES ─────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ── START ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});