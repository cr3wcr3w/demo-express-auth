import type { Request, Response } from "express";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { eq } from 'drizzle-orm';

import { db } from "../db";
import { user, session, refreshTokens } from "../db/schema";

export function getExpiryTime(type: "day" | "week"): Date {
    const now = new Date();
    const expiryMap = {
        day: 24 * 60 * 60 * 1000, // 1 day
        week: 7 * 24 * 60 * 60 * 1000, // 1 week
    };

    return new Date(now.getTime() + expiryMap[type]);
}

export async function createUser(req: Request, res: Response) {
    const { email, password, fName, lName } = req.body;

    try {

        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1)
        if (existingUser.length > 0) {
            throw new Error("An account with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        if (!hashedPassword) {
            throw new Error("An unexpected error occurred");
        }

        const newUser = await db.insert(user).values(
            {
                firstName: fName,
                lastName: lName,
                email,
                createdAt: new Date(),
                updatedAt: new Date(),
                encryptedPassword: hashedPassword,
            }
        ).returning({ id: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName, role_id: user.roleId })
        if (newUser.length === 0) {
            throw new Error("An unexpected error occurred");
        }

        res.status(200).json({ success: true, message: "User created successfully" });

    } catch (error) {
        res.status(500).json(
            {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred",
            })
    }
}

export async function signInUser(req: Request, res: Response) {
    const { email, password } = req.body;
    const ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString();
    const userAgent = req.headers["user-agent"] || "unknown";

    try {

        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1)
        if (existingUser.length === 0) {
            throw new Error("Invalid email or password");
        }

        const passwordResult = await bcrypt.compare(password, existingUser[0].encryptedPassword);
        if (!passwordResult) {
            throw new Error("Invalid email or password");
        }

        // openssl rand -hex 32
        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!
        let refreshToken;

        try {
            await db.transaction(async (tx) => {

                const newSession = await tx.insert(session).values({
                    userId: existingUser[0].id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    notAfter: getExpiryTime('week'),
                    ipAddress,
                    userAgent
                }).returning({ id: session.id });
                if (newSession.length === 0) {
                    throw new Error("An unexpected error occurred");
                }

                refreshToken = jwt.sign({
                    email: existingUser[0].email,
                    firstName: existingUser[0].firstName,
                    lastName: existingUser[0].lastName,
                    id: newSession[0].id
                }, privateKey, { expiresIn: '1d' });

                const newRefreshToken = await tx.insert(refreshTokens).values(
                    {
                        sessionId: newSession[0].id,
                        token: refreshToken,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                ).returning({ id: refreshTokens.id });
                if (newRefreshToken.length === 0) {
                    throw new Error("An unexpected error occurred");
                }
            })
    
        } catch (error) {
            throw new Error("An unexpected error occurred");
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
        }).status(200).json({ success: true, message: "User signin successfully", accessToken })

    } catch (error) {
        res.status(500).json(
            {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred",
            })
    }
}

export const revokeRefreshToken = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken

    try {
        if (!token) {
            throw new Error("Forbidden");
        }

        const result = await db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.token, token));

        if (result.rowCount === 0) {
            throw new Error("An unexpected error occurred");
        }

        res.clearCookie("refreshToken");
        res.status(200).json({ success: true, message: "User signout successfully" });

    } catch (error) {
        res.status(404).json(
            {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred",
            })
    }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            throw new Error("Forbidden");
        }

        const storedToken = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));

        if (storedToken.length === 0) {
            throw new Error("Forbidden");
        }

        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!

        jwt.verify(token, privateKey, (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
            if (err) {
                throw new Error("Forbidden");
            }

            if (!decoded || typeof decoded !== "object" || !decoded.email || !decoded.firstName || !decoded.lastName ) {
                throw new Error("Forbidden");
            }

            const accessToken = jwt.sign(
                {
                    email: (decoded as jwt.JwtPayload).email,
                    firstName: (decoded as jwt.JwtPayload).firstName,
                    lastName: (decoded as jwt.JwtPayload).lastName,
                },
                privateKey,
                { expiresIn: "5m", algorithm: "HS256" }
            );

            res.status(200).json({ success: true, accessToken })
        });

    } catch (error) {
        res.status(403).json(
            {
                success: false,
                message: error instanceof Error ? error.message : "An unexpected error occurred",
            })
    }
};