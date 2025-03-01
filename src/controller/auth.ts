import type { Request, Response } from "express";
import bcrypt from "bcryptjs"
import { db } from "../db";
import { user, session, refreshTokens } from "../db/schema";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';


// import { transporter } from "../config/nodemailer";

export function getExpiryTime(type: "short" | "long"): Date {
    const now = new Date();
    const expiryMap = {
        short: 2 * 60 * 1000, // 2 min
        long: 24 * 60 * 60 * 1000, // 1 day
    };

    return new Date(now.getTime() + expiryMap[type]);
}

export async function createUser(req: Request, res: Response) {
    const { email, password, fName, lName } = req.body; 

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await db.insert(user).values(
            {
                firstName: fName,
                lastName: lName,
                email,
                createdAt: new Date(),
                updatedAt: new Date(),
                encyptedPassword: hashedPassword,
            }
        ).returning({id: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName, role_id: user.roleId})
        if (newUser.length === 0) {
            throw new Error("An unexpected error occurred");
        }

        const newSession = await db.insert(session).values(
            {
                userId: newUser[0].id,
                createdAt: new Date(),
                updatedAt: new Date(),
                notAfter: getExpiryTime('long'),
            }
        ).returning({id: session.id})
        if (newSession.length === 0) {
            throw new Error("An unexpected error occurred");
        }

        // openssl rand -hex 32
        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!

        const refreshToken = jwt.sign({
            jti: uuidv4(),
            userId: newUser[0].id,
            email: newUser[0].email,
        }, privateKey, { expiresIn: '1d' });

        const newRefreshToken = await db.insert(refreshTokens).values(
            {
                sessionId: newSession[0].id,
                token: refreshToken,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ).returning({id: refreshTokens.id})
        if (newRefreshToken.length === 0) {
            throw new Error("An unexpected error occurred");
        }

        const accessToken = jwt.sign(
            {
                userId: newUser[0].id,
                email: newUser[0].email,
                role: newUser[0].role_id,
                firstName: newUser[0].first_name,
                lastName: newUser[0].last_name,
            },
            privateKey,
            { expiresIn: "2m", algorithm: "HS256",  }
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true, 
            secure: true, 
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        })
        .header("Authorization", `Bearer ${accessToken}`)
        .status(200).json({ success: true, message: "User created successfully" });

    }catch (error) {
        res.status(500).json(
            {
                success: false, 
                message: error instanceof Error ? error.message : "An unexpected error occurred",
        })
    }
}

// notes
// revoke old sessions but keep recent ones or allow multiple sessions?
export async function signInUser(req: Request, res: Response) {
    const { email, password } = req.body; 

    try {
        
        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1)
        if (existingUser.length === 0) {
            throw new Error("Invalid email or password");
        }
        
        const passwordResult = await bcrypt.compare(password, existingUser[0].encyptedPassword);
        if (!passwordResult) {
            throw new Error("Invalid email or password");
        }
       
        // openssl rand -hex 32
        const privateKey = process.env.BACKEND_AUTH_PRIVATE_KEY!
        
        const refreshToken = jwt.sign({
            jti: uuidv4(),
            userId: existingUser[0].id,
            email: existingUser[0].email,
        }, privateKey, { expiresIn: '1d' });

        const newSession = await db.insert(session).values({
            userId: existingUser[0].id,
            createdAt: new Date(),
            updatedAt: new Date(),
            notAfter: getExpiryTime('long'),
        }).returning({ id: session.id });
        if (newSession.length === 0) {
            throw new Error("An unexpected error occurred");
        }

        const newRefreshToken = await db.insert(refreshTokens).values(
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

        const accessToken = jwt.sign(
            {
                userId: existingUser[0].id,
                email: existingUser[0].email,
                role: existingUser[0].roleId,
                firstName: existingUser[0].firstName,
                lastName: existingUser[0].lastName,
            },
            privateKey,
            { expiresIn: "2m", algorithm: "HS256",  }
        )
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true, 
            secure: true, 
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000  // 1 day
        })
        .header("Authorization", `Bearer ${accessToken}`)
        .status(200).json({success: true, message: "User login successfully"})

    }catch (error) {
        res.status(500).json(
            {
                success: false, 
                message: error instanceof Error ? error.message : "An unexpected error occurred",
        })
    }
}