import type { Request, Response } from "express";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { eq } from 'drizzle-orm';

import { db } from "../db";
import { users, sessions, refreshTokens, roles, permissions, rolePermissions } from "../db/schema";
import env from "../env";

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
        const { email, password, firstName, lastName } = req.body;

        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (existingUser.length > 0) {
            res.status(409).json({ message: "An account with this email already exists" });
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        if (!hashedPassword) {
            res.status(500).json({ message: "Internal server error" });
            return
        }

        const newUser = await db.insert(users).values(
            {
                firstName,
                lastName,
                email,
                updatedAt: new Date(),
                encryptedPassword: hashedPassword,
                roleId: "10000000-0000-0000-0000-000000000003"
            }
        ).returning({ id: users.id, email: users.email, first_name: users.firstName, last_name: users.lastName, role_id: users.roleId })
        if (newUser.length === 0) {
            res.status(500).json({ message: "Internal server error" });
            return
        }

        res.status(201).json({ message: "User created successfully" });
        return
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
        return
    }
}

export async function signInUser(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString();
        const userAgent = req.headers["user-agent"] || "unknown";

        const existingUser = await db
        .select(
            {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                encryptedPassword: users.encryptedPassword,
                role: roles.name,
                roleId: users.roleId
            }
        )
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.email, email))
        .limit(1);
        if (existingUser.length === 0) {
            const FAKE_BCRYPT_HASH = "$2b$10$gJfPmz8qEJeyMYzhr7oxYekT0YhFh2D2WpHGjNY8zGZk2JzrsGqY2GH";
            
            // Fake password comparison to prevent timing attacks.
            // - Even if the email doesn't exist, we always run bcrypt.compare().
            // - This ensures the response time remains consistent for valid and invalid users.
            // - Prevents attackers from detecting valid emails based on response times.
            // - you can calculate the ms by using perf_hooks lib
            //   - const time = performance.now();
            await bcrypt.hash(FAKE_BCRYPT_HASH, 10);

            res.status(401).json({ message: "Invalid input" });
            return
        }

        const passwordResult = await bcrypt.compare(password, existingUser[0].encryptedPassword);
        if (!passwordResult) {
            res.status(401).json({ message: "Invalid input" });
            return
        }

        const permissionList = await db
        .select({scope: permissions.scope }) 
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, existingUser[0].roleId))
        const permissionsArray = permissionList.map((p) => p.scope);

        if (permissionList.length === 0) {
            res.status(500).json({ message: "Internal server error" });
            return
        }

        const privateKey = env.BACKEND_AUTH_PRIVATE_KEY!
        let refreshToken: string | null = null;

        try {
            await db.transaction(async (tx) => {
                const newSession = await tx.insert(sessions).values({
                    userId: existingUser[0].id,
                    updatedAt: new Date(),
                    notAfter: getExpiryTime('week'),
                    ipAddress,
                    userAgent,
                    refreshAt: new Date(),
                }).returning({ id: sessions.id });
                if (newSession.length === 0) {
                    res.status(500).json({ message: "Internal server error" });
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
                    res.status(500).json({ message: "Internal server error" });
                    return
                }
            })

        } catch (error) {
            res.status(500).json({ message: "Internal server error" })
            return
        }

        const accessToken = jwt.sign(
            {
                email: existingUser[0].email,
                firstName: existingUser[0].firstName,
                lastName: existingUser[0].lastName,
                role: existingUser[0].role,
                "permission": permissionsArray
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
        res.status(200).json({ message: "User signin successfully", accessToken })
        return
    } catch (_) {
        res.status(500).json({ message: "Internal server error" });
        return
    }
}

export const revokeRefreshToken = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }

        const result = await db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.token, token));

        if (result.rowCount === 0) {
            res.status(404).json({ message: "Not Found" });
            return
        }

        res.clearCookie("refreshToken");
        res.status(200).json({ message: "Signed out" });
        return
    } catch (_) {
        res.status(500).json({ message: "Internal server error" });
        return
    }
};
