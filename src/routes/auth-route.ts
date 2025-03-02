import express from "express";
import { validateAuthSignIn, validateAuthSignup } from "../middleware/auth-validation";
import { createUser, signInUser } from "../controller/auth";
import { revokeRefreshToken } from "../middleware/auth-logout";

export const authRoutes = express.Router();

authRoutes.post("/signup", validateAuthSignup, createUser);

authRoutes.post("/signin", validateAuthSignIn, signInUser);

authRoutes.post("/signout", revokeRefreshToken);
