import express from "express";
import { createInvitationToken } from "../controller/auth/create-invitation-token";
import { createUser } from "../controller/auth/create-user";
import { getAccessToken } from "../controller/auth/get-access-token";
import { getProfile } from "../controller/auth/get-profile";
import { signInUser } from "../controller/auth/signin-user";
import { signoutUser } from "../controller/auth/signout-user";
import { verifyInvitationToken } from "../controller/auth/verify-invitation-token";
import {
	validateAuthInvitation,
	validateAuthSignIn,
	validateAuthSignup,
} from "../middleware/auth/validate-body";
import { checkPermissions } from "../middleware/rabc";

export const authRoutes = express.Router();

authRoutes.post("/signup", validateAuthSignup, createUser);

authRoutes.post("/signin", validateAuthSignIn, signInUser);

authRoutes.post("/signout", signoutUser);

authRoutes.get(
	"/profile",
	checkPermissions({ requiredPermissions: ["read:profile"] }),
	getProfile,
);

authRoutes.post(
	"/renew-access-token",
	checkPermissions({
		requiredPermissions: ["generate:access-token"],
		checkAccessToken: false,
	}),
	getAccessToken,
);

authRoutes.post(
	"/generate-invitation",
	checkPermissions({
		requiredPermissions: ["create:invitation"],
	}),
	validateAuthInvitation,
	createInvitationToken,
);

authRoutes.post("/verify-invitation", verifyInvitationToken);
