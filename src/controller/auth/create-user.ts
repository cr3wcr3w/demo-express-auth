import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db";
import { roles, users } from "../../db/schema/auth";

// this function will change after invitation signup with token is implemented
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
				res.status(500).json({ message: "here: Internal server error" });
				return;
			}

			roleId = role[0].id;
		} else {
			roleId = invitationToken;
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
