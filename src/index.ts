import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { authRoutes } from "./routes/auth-route";

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get("/api", (req, res) => {
  res.send("Express + TypeScript Server is running!");
});

app.use("/api/auth", authRoutes)

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
