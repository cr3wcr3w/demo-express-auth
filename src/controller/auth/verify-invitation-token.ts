import { and, eq, gt, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { oneTimeTokens } from "../../db/schema/auth";

export async function verifyInvitationToken(req: Request, res: Response) {
	try {
		const { tokenHash } = req.body;

		if (!tokenHash) {
			res.status(400).json({ message: "Token hash is required." });
			return;
		}

		const nowResult = await db.execute(sql`SELECT NOW() AS current_timestamp`);
		const now = new Date(nowResult.rows[0].current_timestamp);

		const token = await db
			.select()
			.from(oneTimeTokens)
			.where(
				and(
					eq(oneTimeTokens.tokenHash, tokenHash),
					gt(oneTimeTokens.notAfter, now),
				),
			)
			.limit(1);

		if (token.length === 0 || token[0].revoked) {
			res.status(400).json({ message: "Invalid or expired token." });
			return;
		}

		res.status(200).json({ message: "Token is valid." });
		return;
	} catch (_error) {
		res.status(500).json({ message: "Internal server error" });
	}
}
