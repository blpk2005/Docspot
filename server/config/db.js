const mongoose = require("mongoose");

const connectDB = async () => {
  const rawUrl = process.env.MONGO_URL;
  if (!rawUrl) {
    console.error("⚠️ MONGO_URL environment variable is missing in Render Environment Variables!");
    return;
  }

  const mongoUri = rawUrl.trim().replace(/^["']|["']$/g, "");

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.name, error.message);
    if (error.name === "MongoServerSelectionError") {
      console.error("👉 IP Whitelist hint: In MongoDB Atlas -> Network Access, ensure 0.0.0.0/0 is added so Render can connect!");
    }
  }
};

module.exports = connectDB;