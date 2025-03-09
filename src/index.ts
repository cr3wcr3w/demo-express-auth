import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./env";
import { RateLimitCategory, applyRateLimit } from "./middleware/rate-limit";
import { authRoutes } from "./routes/auth-route";

const app = express();
const PORT = env.BACKEND_PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", applyRateLimit(RateLimitCategory.LENIENT), authRoutes);

// Start Server
app.listen(PORT, () => {
	// biome-ignore lint/suspicious/noConsole:
	console.log(`Server running on http://localhost:${PORT}`);
});
