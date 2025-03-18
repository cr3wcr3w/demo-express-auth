import { eq, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import { refreshTokens, sessions } from "../db/schema/auth";
import {
	isAccessTokenValidated,
	isRefreshTokenValidated,
} from "../helper/auth/validate-token";

// <verb>:<resource>
// Common verbs include "read", "write", "create", "update", "delete", "approve", "invite",
// Resources can include specific entities, data types, or functionalities (e.g., "users", "products", "orders", "settings").

/**
 * Middleware to enforce role-based access control (RBAC).
 *
 * - Validates the access token.
 * - Validates the refresh token, including revocation status.
 * - Validates if the session is still active (`notAfter`).
 * - Confirms the user has the required permissions.
 *
 * @param requiredPermissions - List of required permission scopes (e.g., `["read:profile"]`).
 * @returns Express middleware function that enforces RBAC.
 *
 * @example
 * ```ts
 * authRoutes.get("/profile", checkPermissions(["read:profile"]), getProfile);
 * ```
 */
export const checkPermissions = (requiredPermissions: string[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization;
			const accessToken = authHeader?.split(" ")[1];
			if (!accessToken) {
				res.status(500).json({ message: "Internal server error" });
				return;
			}

			const { isTokenValid, decodedAccessToken } = await isAccessTokenValidated(
				{ accessToken, returnDecoded: true },
			);

			if (!isTokenValid || !decodedAccessToken) {
				res.status(401).json({ message: "Unauthorized: Invalid token" });
				return;
			}

			const refreshTokenCookies = req.cookies.refreshToken;
			const isRefreshTokenValidatedResult =
				await isRefreshTokenValidated(refreshTokenCookies);
			if (!refreshTokenCookies || !isRefreshTokenValidatedResult) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}

			const sessionRecord = await db
				.select({
					notAfter: sessions.notAfter,
					revoked: refreshTokens.revoked,
					sessionId: refreshTokens.sessionId,
				})
				.from(refreshTokens)
				.innerJoin(sessions, eq(refreshTokens.sessionId, sessions.id))
				.where(eq(refreshTokens.token, refreshTokenCookies))
				.limit(1);

			const nowResult = await db.execute(
				sql`SELECT NOW() AS current_timestamp`,
			);
			const now = new Date(nowResult.rows[0].current_timestamp);

			if (sessionRecord.length === 0 || sessionRecord[0].revoked) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}

			const { notAfter } = sessionRecord[0];

			if (notAfter < now) {
				res
					.status(401)
					.json({ message: "Session expired, please log in again" });
				return;
			}

			if (
				typeof decodedAccessToken !== "object" ||
				decodedAccessToken === null
			) {
				res.status(401).json({ message: "Unauthorized: Invalid token format" });
				return;
			}

			if (!decodedAccessToken.permission) {
				res.status(401).json({ message: "Unauthorized: Invalid token format" });
				return;
			}

			const userPermissions: string[] = decodedAccessToken.permission;
			const hasPermission = requiredPermissions.every((perm) =>
				userPermissions.includes(perm),
			);

			if (!hasPermission) {
				res
					.status(403)
					.json({ message: "Forbidden: Insufficient permissions" });
				return;
			}

			next();
		} catch (_error) {
			res.status(500).json({ message: "Internal server error" });
		}
	};
};
