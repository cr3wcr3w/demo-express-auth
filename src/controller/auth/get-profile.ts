import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { refreshTokens, sessions, users } from "../../db/schema/auth";
import {
	isAccessTokenValidated,
	isRefreshTokenValidated,
} from "../../helper/auth/validate-token";

export const getProfile = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;
		const accessToken = authHeader?.split(" ")[1];
		if (!accessToken) {
			res.status(500).json({ message: "Internal server error" });
			return;
		}

		const { isTokenValid } = await isAccessTokenValidated({
			accessToken,
			returnDecoded: false,
		});

		if (!isTokenValid) {
			res.status(401).json({ message: "Unauthorized: Invalid token" });
			return;
		}

		const refreshTokenCookies = req.cookies.refreshToken;
		if (
			!refreshTokenCookies ||
			!(await isRefreshTokenValidated(refreshTokenCookies))
		) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

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

		const sessionId = record[0].sessionId;
		const sessionNotAfter = new Date(record[0].sessionNotAfter);
		// SELECT DATE(NOW()) AS current_timestamp; // no time
		// SELECT NOW() AS current_timestamp; // with time
		const nowResult = await db.execute(sql`SELECT DATE(NOW()) AS current_date`);
		const nowDate = new Date(nowResult.rows[0].current_date);

		const sessionNotAfterDay = sessionNotAfter.getUTCDate();
		const sessionNotAfterMonth = sessionNotAfter.getUTCMonth();
		const sessionNotAfterYear = sessionNotAfter.getUTCFullYear();

		const nowYear = nowDate.getUTCFullYear();
		const nowMonth = nowDate.getUTCMonth();
		const nowDay = nowDate.getUTCDate();

		const isSameDay =
			Number(sessionNotAfterDay) === Number(nowDay) &&
			Number(sessionNotAfterMonth) === Number(nowMonth) &&
			Number(sessionNotAfterYear) === Number(nowYear);

		if (isSameDay) {
			const newNotAfter = new Date(sessionNotAfter);
			newNotAfter.setDate(newNotAfter.getDate() + 1);
			await db
				.update(sessions)
				.set({ notAfter: newNotAfter })
				.where(eq(sessions.id, sessionId));
		}

		const userId = record[0].userId;
		const userProfile = await db
			.select({
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
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
