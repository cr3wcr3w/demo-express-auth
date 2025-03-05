import express from "express";

import { authenticateToken, validateAuthSignIn, validateAuthSignup } from "../middleware";
import { createUser, revokeRefreshToken, signInUser } from "../controller";

export const authRoutes = express.Router();

authRoutes.post("/signup", validateAuthSignup, createUser);

authRoutes.post("/signin", validateAuthSignIn, signInUser);

authRoutes.post("/signout", revokeRefreshToken);

authRoutes.get("/protected", authenticateToken, (_, res) => {
    res.json({ message: "Welcome admin" });
});