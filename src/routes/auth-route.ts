import express from "express";
import { createUser } from "../controller/auth/create-user";
import { getAccessToken } from "../controller/auth/get-acces-token";
import { getProfile } from "../controller/auth/get-profile";
import { signInUser } from "../controller/auth/signin-user";
import { signoutUser } from "../controller/auth/signout-user";
import {
	validateAuthSignIn,
	validateAuthSignup,
} from "../middleware/auth/validate-body";

export const authRoutes = express.Router();

authRoutes.post("/signup", validateAuthSignup, createUser);

authRoutes.post("/signin", validateAuthSignIn, signInUser);

authRoutes.post("/signout", signoutUser);

authRoutes.post("/profile", getProfile);

authRoutes.post("/renew-access-token", getAccessToken);
