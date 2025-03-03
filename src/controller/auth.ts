import type { Request, Response } from "express";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { eq } from 'drizzle-orm';

import { db } from "../db";
import { users, sessions, refreshTokens } from "../db/schema";

export function getExpiryTime(type: "day" | "week"): Date {
    const now = new Date();
    const expiryMap = {
        day: 24 * 60 * 60 * 1000, // 1 day
        week: 7 * 24 * 60 * 60 * 1000, // 1 week
    };

    return new Date(now.getTime() + expiryMap[type]);
}

export async function createUser(req: Request, res: Response) {
    try {
        const { email, password, fName, lName } = req.body;

        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (existingUser.length > 0) {
            res.status(409).json({ success: false, message: "An account with this email already exists" });
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        if (!hashedPassword) {
            res.status(500).json({ success: false, message: "Failed to hash password" });
            return
        }

        const newUser = await db.insert(users).values(
            {
                firstName: fName,
                lastName: lName,
                email,
                updatedAt: new Date(),
                encryptedPassword: hashedPassword,
            }
        ).returning({ id: users.id, email: users.email, first_name: users.firstName, last_name: users.lastName, role_id: users.roleId })
        if (newUser.length === 0) {
            res.status(500).json({ success: false, message: "Failed to create user" });
            return
        }

        res.status(201).json({ success: true, message: "User created successfully" });
        return
    } catch (_) {
        res.status(500).json({ success: false, message: "Internal server error" });
        return
    }
}

export async function signInUser(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString();
        const userAgent = req.headers["user-agent"] || "unknown";

        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (existingUser.length === 0) {
            res.status(401).json({ success: false, message: "Invalid email or password" });
            return
        }

        const passwordResult = await bcrypt.compare(password, existingUser[0].encryptedPassword);
        if (!passwordResult) {
            res.status(401).json({ success: false, message: "Invalid email or password" });
            return
        }

        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!
        let refreshToken: string | null = null;

        try {
            await db.transaction(async (tx) => {    
                const newSession = await tx.insert(sessions).values({
                    userId: existingUser[0].id,
                    updatedAt: new Date(),
                    notAfter: getExpiryTime('week'),
                    ipAddress,
                    userAgent
                }).returning({ id: sessions.id });
                if (newSession.length === 0) {
                    res.status(500).json({ success: false, message: "Failed to create session" });
                    return
                }

                refreshToken = jwt.sign(
                    {
                        email: existingUser[0].email,
                        firstName: existingUser[0].firstName,
                        lastName: existingUser[0].lastName,
                        id: newSession[0].id
                
                    }, 
                    privateKey, 
                    { 
                        expiresIn: '1d' 
                    }
                );

                const newRefreshToken = await tx.insert(refreshTokens).values(
                    {
                        sessionId: newSession[0].id,
                        token: refreshToken,
                        updatedAt: new Date(),
                    }
                ).returning({ id: refreshTokens.id });
                if (newRefreshToken.length === 0) {
                    res.status(500).json({ success: false, message: "Failed to store refresh token" });
                    return
                }
            })
    
        } catch (error) {
            res.status(500).json({ success: false, message: "Transaction failed" })
            return
        }

        const accessToken = jwt.sign(
            {
                email: existingUser[0].email,
                firstName: existingUser[0].firstName,
                lastName: existingUser[0].lastName,
            },
            privateKey,
            { expiresIn: "5m", algorithm: "HS256", }
        )

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000  // 1 week
        })
        res.status(200).json({ success: true, message: "User signin successfully", accessToken })
        return
    } catch (_) {
        res.status(500).json({ success: false, message: "Internal server error" });
        return
    }
}

export const revokeRefreshToken = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            res.status(401).json({ success: false, message: "Missing refresh token" });
            return 
        }

        const result = await db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.token, token));

        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "Refresh token not found or already revoked" });
            return 
        }

        res.clearCookie("refreshToken");
        res.status(200).json({ success: true, message: "User signed out successfully" });
        return
    } catch (_) {
        res.status(500).json({ success: false, message: "Internal server error" });
        return
    }
};

export const refreshAccessToken = async (req: Request, res: Response)  => {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            res.status(401).json({ success: false, message: "Missing refresh token" });
            return
        }

        const storedToken = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));

        if (storedToken.length === 0) {
            res.status(403).json({ success: false, message: "Invalid refresh token" });
            return
        }

        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!

        let decoded: jwt.JwtPayload;
        try {
            decoded = jwt.verify(token, privateKey) as jwt.JwtPayload;
        } catch (err) {
            res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
            return
        }

        if (!decoded || !decoded.email || !decoded.firstName || !decoded.lastName) {
            res.status(403).json({ success: false, message: "Malformed refresh token" });
            return
        }

        const accessToken = jwt.sign(
            {
                email: decoded.email,
                firstName: decoded.firstName,
                lastName: decoded.lastName,
            },
            privateKey,
            { expiresIn: "5m", algorithm: "HS256" }
        );

        res.status(200).json({ success: true, accessToken });
        return

    } catch (_) {
        res.status(500).json({ success: false, message: "Internal server error" });
        return
    }
};