import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { oneTimeTokens, roles, users } from "../../db/schema/auth";

export async function createUser(req: Request, res: Response) {
	try {
		const { email, password, firstName, lastName, invitationToken } = req.body;

		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		if (existingUser.length > 0) {
			res
				.status(409)
				.json({ message: "An account with this email already exists" });
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		if (!hashedPassword) {
			res.status(500).json({ message: "Internal server error" });
			return;
		}

		let roleId: string;

		if (!invitationToken) {
			const role = await db
				.select({ id: roles.id })
				.from(roles)
				.where(eq(roles.name, "guest"))
				.limit(1);
			if (role.length < 0) {
				res.status(500).json({ message: "Internal server error" });
				return;
			}

			roleId = role[0].id;
		} else {
			const tokenRecord = await db
				.select({
					id: oneTimeTokens.id,
					revoked: oneTimeTokens.revoked,
					notAfter: oneTimeTokens.notAfter,
					metadata: oneTimeTokens.metadata,
				})
				.from(oneTimeTokens)
				.where(
					and(
						eq(oneTimeTokens.tokenHash, invitationToken),
						gt(oneTimeTokens.notAfter, sql`NOW()`),
					),
				)
				.limit(1);

			if (tokenRecord.length === 0) {
				res
					.status(400)
					.json({ message: "Invalid or expired invitation token." });
				return;
			}

			if (tokenRecord[0].revoked) {
				res.status(400).json({ message: "This token has already been used." });
				return;
			}

			const metadata = tokenRecord[0].metadata as { roleId?: string };
			if (!metadata.roleId) {
				res.status(500).json({ message: "Internal server error" });
				return;
			}
			roleId = metadata.roleId;

			await db
				.update(oneTimeTokens)
				.set({ revoked: true })
				.where(eq(oneTimeTokens.id, tokenRecord[0].id));
		}

		const newUser = await db
			.insert(users)
			.values({
				firstName,
				lastName,
				email,
				updatedAt: sql`NOW()`,
				encryptedPassword: hashedPassword,
				roleId: roleId,
			})
			.returning({
				id: users.id,
				email: users.email,
				first_name: users.firstName,
				last_name: users.lastName,
				role_id: users.roleId,
			});
		if (newUser.length === 0) {
			res.status(500).json({ message: "Internal server error" });
			return;
		}

		res.status(201).json({ message: "User created successfully" });
		return;
	} catch (_error) {
		res.status(500).json({ message: "Internal server error" });
		return;
	}
}
