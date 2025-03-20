import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import {
	permissions,
	refreshTokens,
	rolePermissionConnection,
	roles,
	sessions,
	users,
} from "../../db/schema/auth";
import { env } from "../../env";
import { decryptToken } from "../../helper/auth/validate-token";

export const getAccessToken = async (req: Request, res: Response) => {
	try {
		const refreshTokenCookies = req.cookies.refreshToken;
		const decodedRefreshToken = await decryptToken(refreshTokenCookies);
		const nowResult = await db.execute(sql`SELECT NOW() AS current_timestamp`);
		const now = new Date(nowResult.rows[0].current_timestamp);

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

		if (sessionRecord.length === 0 || sessionRecord[0].revoked) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const { notAfter } = sessionRecord[0];

		if (notAfter < now) {
			res.status(401).json({ message: "Session expired, please log in again" });
			return;
		}

		if (
			!decodedRefreshToken ||
			typeof decodedRefreshToken !== "object" ||
			!decodedRefreshToken.email
		) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		// Get user and permissions
		const existingUser = await db
			.select({
				id: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				role: roles.name,
				roleId: users.roleId,
			})
			.from(users)
			.leftJoin(roles, eq(users.roleId, roles.id))
			.where(eq(users.email, decodedRefreshToken.email))
			.limit(1);

		if (existingUser.length === 0) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const permissionList = await db
			.select({ scope: permissions.scope })
			.from(rolePermissionConnection)
			.innerJoin(
				permissions,
				eq(rolePermissionConnection.permissionId, permissions.id),
			)
			.where(eq(rolePermissionConnection.roleId, existingUser[0].roleId));

		if (permissionList.length === 0) {
			res.status(500).json({ message: "Internal server error" });
			return;
		}

		const permissionsArray = permissionList.map((p) => p.scope);

		const privateKey = env.BACKEND_AUTH_PRIVATE_KEY;

		// Generate new access token
		const accessToken = jwt.sign(
			{
				email: existingUser[0].email,
				firstName: existingUser[0].firstName,
				lastName: existingUser[0].lastName,
				role: existingUser[0].role,
				permission: permissionsArray,
			},
			privateKey,
			{ expiresIn: "1d", algorithm: "HS256" },
		);

		res
			.status(200)
			.json({ message: "Access token generated successfully", accessToken });
	} catch (_error) {
		res.status(500).json({ message: "Internal server error" });
	}
};
