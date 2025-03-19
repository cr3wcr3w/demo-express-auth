import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

const lowercaseRegex = /[a-z]/;
const uppercaseRegex = /[A-Z]/;
const numberRegex = /\d/;
const specialCharRegex = /[!@#$%^&*]/;

export const authSignupSchema = z.object({
	email: z.string().email(),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters long")
		.refine((password) => {
			const conditions = [
				lowercaseRegex.test(password),
				uppercaseRegex.test(password),
				numberRegex.test(password),
				specialCharRegex.test(password),
			];
			return conditions.filter(Boolean).length >= 3;
		}, "Password must include at least 3 of the following: lowercase, uppercase, number, special character (!@#$%^&*)"),
	firstName: z.string(),
	lastName: z.string(),
});

export function validateAuthSignup(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const result = authSignupSchema.safeParse(req.body);
	if (!result.success) {
		res.status(400).json({ message: "Invalid input" });
		return;
	}

	next();
}

export const authSigninSchema = z.object({
	email: z.string().email(),
	password: z.string(),
});

export function validateAuthSignIn(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const result = authSigninSchema.safeParse(req.body);

	if (!result.success) {
		res.status(400).json({ message: "Invalid input" });
		return;
	}

	next();
}

export const authInvitationSchema = z.object({
	roleId: z.string(),
});

export function validateAuthInvitation(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const result = authInvitationSchema.safeParse(req.body);

	if (!result.success) {
		res.status(400).json({ message: "Invalid input" });
		return;
	}

	next();
}
