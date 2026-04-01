import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRoutes } from "./routes/auth.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { reconciliationRoutes } from "./routes/reconciliation.routes.js";
import { exportRoutes } from "./routes/export.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/export", exportRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
