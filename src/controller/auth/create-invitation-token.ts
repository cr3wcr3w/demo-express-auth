import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { oneTimeTokens } from "../../db/schema/auth";

export async function createInvitationToken(req: Request, res: Response) {
	try {
		const { roleId } = req.body;

		const token = crypto.randomBytes(32).toString("hex");

		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		await db.insert(oneTimeTokens).values({
			tokenHash: hashedToken,
			tokenType: "invitation",
			metadata: { roleId },
			updatedAt: sql`NOW()`,
			notAfter: sql`NOW() + INTERVAL '1 week'`,
		});

		res.status(201).json({ message: "One-time token created." });
		return;
	} catch (_error) {
		res.status(500).json({ message: "Internal server error" });
		return;
	}
}
