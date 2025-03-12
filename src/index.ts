import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./env";
import { RateLimitCategory, applyRateLimit } from "./middleware/rate-limit";
import { authRoutes } from "./routes/auth-route";

const app = express();
const PORT = env.BACKEND_PORT;

// app.use(
// 	cors({
// 	  origin: "http://localhost.com", // Replace with your frontend's origin
// 	  methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
// 	  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
// 	})
// );
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", applyRateLimit(RateLimitCategory.STRICT), authRoutes);

// Start Server
app.listen(PORT, () => {
	// biome-ignore lint/suspicious/noConsole:
	console.log(`Server running on http://localhost:${PORT}`);
});
