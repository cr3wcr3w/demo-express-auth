import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { refreshTokens } from "../db/schema";

export const revokeRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.cookies.refreshToken

        const result = await db
            .update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.token, token));
        
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "An unexpected error occurred" });
            return
        }

        res.clearCookie("refreshToken");
        res.status(200).json({ success: true, message: "User signout successfully" });
    } catch (error) {
        next(error);
    }
};
