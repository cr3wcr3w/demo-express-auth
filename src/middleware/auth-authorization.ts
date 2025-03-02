import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";

import { db } from "../db";
import { refreshTokens, session } from "../db/schema";

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
    try {
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];

        if (!accessToken) {
             res.status(401).json({ message: "Forbidden" });
             return
        }

        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!;

        const decodedAccessToken = jwt.verify(accessToken, privateKey) as jwt.JwtPayload;

        if (!decodedAccessToken || typeof decodedAccessToken !== "object" || !decodedAccessToken.email || !decodedAccessToken.firstName || !decodedAccessToken.lastName) {
             res.status(403).json({ message: "Forbidden" });
             return
        }

        const refreshToken = req.cookies.refreshToken

        if (!refreshToken) {
            res.status(401).json({ message: "Forbidden" });
            return
        }

        const decodedRefreshToken = jwt.verify(refreshToken, privateKey) as jwt.JwtPayload;
        if (!decodedRefreshToken || typeof decodedRefreshToken !== "object" || !decodedRefreshToken.id) {
            res.status(403).json({ message: "Forbidden" });
            return
        }

        const userSession = await db
            .select()
            .from(session)
            .innerJoin(refreshTokens, eq(refreshTokens.sessionId, session.id))
            .where(and(eq(session.id, decodedRefreshToken.id), eq(refreshTokens.token, refreshToken)))
            .limit(1);
        
        if (userSession.length === 0 || userSession[0].session.notAfter < new Date() || userSession[0].refresh_tokens.revoked) {
            res.status(403).json({ message: "Session expired" });
            return
        }

        next();
    } catch (error) {
         res.status(500).json({ message: "Forbidden" });
         return
    }
};
