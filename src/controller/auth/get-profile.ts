import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { refreshTokens, roles, sessions, users } from "../../db/schema/auth";

export const getProfile = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const refreshTokenCookies = req.cookies.refreshToken;

		// get record table from refresh and session table
		const record = await db
			.select({
				sessionNotAfter: sessions.notAfter,
				sessionId: sessions.id,
				userId: sessions.userId,
			})
			.from(refreshTokens)
			.innerJoin(sessions, eq(refreshTokens.sessionId, sessions.id))
			.where(eq(refreshTokens.token, refreshTokenCookies))
			.limit(1);

		if (record.length === 0) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const userId = record[0].userId;
		const userProfile = await db
			.select({
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				roleId: users.roleId,
				roleName: roles.name,
			})
			.from(users)
			.leftJoin(roles, eq(users.roleId, roles.id))
			.where(eq(users.id, userId))
			.limit(1);

		if (userProfile.length === 0) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(200).json(userProfile[0]);
		return;
	} catch (_error) {
		res.status(500).json({ message: "Internal server error" });
		return;
	}
};
