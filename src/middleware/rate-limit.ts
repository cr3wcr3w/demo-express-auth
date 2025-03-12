import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

export enum RateLimitCategory {
	LENIENT = "lenient",
	MODERATE = "moderate",
	STRICT = "strict",
}

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	max: number; // Max requests before blocking
}

const rateConfigs: Record<RateLimitCategory, RateLimitConfig> = {
	[RateLimitCategory.LENIENT]: { windowMs: 5 * 60 * 1000, max: 200 }, // 200 requests per 5 minutes
	[RateLimitCategory.MODERATE]: { windowMs: 10 * 60 * 1000, max: 50 }, // 50 requests per 10 minutes
	[RateLimitCategory.STRICT]: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 requests per 15 minutes
};

/**
 * Create a rate limiter middleware
 * @param {RateLimitCategory} category - Category of rate limiting
 * @returns {RequestHandler} - Express middleware
 */
export function applyRateLimit(category: RateLimitCategory): RequestHandler {
	const config = rateConfigs[category];

	return rateLimit({
		windowMs: config.windowMs,
		max: config.max,
		message: "Too many requests, please try again later.",
		standardHeaders: true,
		legacyHeaders: false,
	});
}

// sample
// import {  applyRateLimit, RateLimitCategory } from "./middleware";
// app.get("/api", applyRateLimit(RateLimitCategory.STRICT), (req, res) => {
//   res.send("Express + TypeScript Server is running!");
// });
