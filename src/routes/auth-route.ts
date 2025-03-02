import express from "express";

import { validateAuthSignIn, validateAuthSignup } from "../middleware/auth-validation";
import { createUser, refreshAccessToken, revokeRefreshToken, signInUser } from "../controller/auth";
import { authenticateToken } from "../middleware/auth-authorization";

export const authRoutes = express.Router();

authRoutes.post("/signup", validateAuthSignup, createUser);

authRoutes.post("/signin", validateAuthSignIn, signInUser);

authRoutes.post("/signout", revokeRefreshToken);

authRoutes.post("/refresh", refreshAccessToken);

authRoutes.get("/protected", authenticateToken, (_, res) => {
    res.json({ message: "Welcome to protected routes" });
});