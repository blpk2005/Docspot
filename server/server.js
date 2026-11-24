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

// ── STATIC FILES & UPLOADS ────────────────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// ── SERVE REACT FRONTEND IN PRODUCTION ────────────────────────────
const clientBuildPath = path.join(__dirname, "../client/build");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DocSpot API</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
            h1 { color: #2563eb; margin-bottom: 8px; }
            p { color: #64748b; line-height: 1.6; }
            .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #16a34a; font-weight: 600; border-radius: 99px; font-size: 0.85rem; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>DocSpot Backend API</h1>
            <div class="badge">✅ Online & Running</div>
            <p>The backend server is live on Render. To serve the frontend, build the React client or deploy the frontend static site.</p>
          </div>
        </body>
      </html>
    `);
  });
}

// ── START ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});