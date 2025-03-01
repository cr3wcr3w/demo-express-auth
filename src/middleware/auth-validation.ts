import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export enum UserRole {
    Resident = "resident",
    WasteWorker = "waste_worker",
    Manager = "manager",
    Admin = "admin",
    Guest = "guest",
}

export const authSignupSchema = z.object({
    email: z.string().email(),  
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .refine((password) => {
            const conditions = [
                /[a-z]/.test(password), // Lowercase
                /[A-Z]/.test(password), // Uppercase
                /\d/.test(password), // Number
                /[!@#$%^&*]/.test(password), // Special character
            ];
            return conditions.filter(Boolean).length >= 3;
        }, "Password must include at least 3 of the following: lowercase, uppercase, number, special character (!@#$%^&*)"),
    fName: z.string(),
    lName: z.string(),
    role: z.enum([UserRole.Admin, UserRole.Guest, UserRole.Manager, UserRole.Resident, UserRole.WasteWorker])
});

export function validateAuthSignup(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = authSignupSchema.safeParse(req.body);
  
    if (!result.success) {
      res
        .status(400)
      return;
    }
  
    next();
}

export const authSigninSchema = z.object({
  email: z.string().email(),  
  password: z.string()     
});

export function validateAuthSignIn(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = authSigninSchema.safeParse(req.body);

  if (!result.success) {
    res
      .status(400)
    return;
  }

  next();
}

