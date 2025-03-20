import { eq, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db";
import {
	permissions,
	refreshTokens,
	rolePermissionConnection,
	roles,
	sessions,
} from "../db/schema/auth";
import {
	isAccessTokenValidated,
	isRefreshTokenValidated,
} from "../helper/auth/validate-token";

// <verb>:<resource>
// Common verbs include "read", "write", "create", "update", "delete", "approve", "invite",
// Resources can include specific entities, data types, or functionalities (e.g., "users", "products", "orders", "settings").

type checkPermissionsType = {
	requiredPermissions: string[];
	checkAccessToken?: boolean;
};

export const checkPermissions = ({
	requiredPermissions,
	checkAccessToken = true,
}: checkPermissionsType) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization;
			let userPermissions: string[] = [];

			const refreshTokenCookies = req.cookies.refreshToken;
			const { decodedRefreshToken, isTokenValid } =
				await isRefreshTokenValidated({
					refreshToken: refreshTokenCookies,
					returnDecoded: true,
				});

			if (!refreshTokenCookies || !isTokenValid) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}

			if (checkAccessToken) {
				const accessToken = authHeader?.split(" ")[1];
				if (!accessToken) {
					res.status(500).json({ message: "Internal server error" });
					return;
				}

				const { isTokenValid, decodedAccessToken } =
					await isAccessTokenValidated({ accessToken, returnDecoded: true });

				if (!isTokenValid || !decodedAccessToken) {
					res.status(401).json({ message: "Unauthorized: Invalid token" });
					return;
				}

				if (
					typeof decodedAccessToken !== "object" ||
					decodedAccessToken === null
				) {
					res
						.status(401)
						.json({ message: "Unauthorized: Invalid token format" });
					return;
				}

				if (!decodedAccessToken.permission) {
					res
						.status(401)
						.json({ message: "Unauthorized: Invalid token format" });
					return;
				}

				userPermissions = decodedAccessToken.permission;
			} else {
				if (
					typeof decodedRefreshToken !== "object" ||
					decodedRefreshToken === null
				) {
					res
						.status(401)
						.json({ message: "Unauthorized: Invalid token format" });
					return;
				}

				if (!decodedRefreshToken.role) {
					res
						.status(401)
						.json({ message: "Unauthorized: Invalid token format" });
					return;
				}

				const permissionList = await db
					.select({ scope: permissions.scope })
					.from(rolePermissionConnection)
					.innerJoin(roles, eq(rolePermissionConnection.roleId, roles.id))
					.innerJoin(
						permissions,
						eq(rolePermissionConnection.permissionId, permissions.id),
					)
					.where(eq(roles.name, decodedRefreshToken.role));

				if (permissionList.length === 0) {
					res.status(500).json({ message: "Internal server error" });
					return;
				}
				const permissionsArray = permissionList.map((p) => p.scope);

				userPermissions = permissionsArray;
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
