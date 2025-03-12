import type { NextFunction, Request, Response } from "express";
import { isAccessTokenValidated } from "../helper/auth/validate-token";

// <verb>:<resource>
// Common verbs include "read", "write", "create", "update", "delete", "approve", "invite",
// Resources can include specific entities, data types, or functionalities (e.g., "users", "products", "orders", "settings").

// sample use
// authRoutes.get("/profile", checkPermissions(['read:users', 'write:users']), getProfile);
export const checkPermissions = (requiredPermissions: string[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization;
			const accessToken = authHeader?.split(" ")[1];
			if (!accessToken) {
				res.status(500).json({ message: "Internal server error" });
				return;
			}

			const { isTokenValid, decodedAccessToken } = await isAccessTokenValidated(
				{ accessToken, returnDecoded: true },
			);

			if (!isTokenValid || !decodedAccessToken) {
				res.status(401).json({ message: "Unauthorized: Invalid token" });
				return;
			}

			if (
				typeof decodedAccessToken !== "object" ||
				decodedAccessToken === null
			) {
				res.status(401).json({ message: "Unauthorized: Invalid token format" });
				return;
			}

			if (!decodedAccessToken.permission) {
				res.status(401).json({ message: "Unauthorized: Invalid token format" });
				return;
			}

			const userPermissions: string[] = decodedAccessToken.permission;
			const hasPermission = requiredPermissions.every((perm) =>
				userPermissions.includes(perm),
			);

			if (!hasPermission) {
				res
					.status(403)
					.json({ message: "Forbidden: Insufficient permissions" });
				return;
			}

			next();
		} catch (_error) {
			res.status(500).json({ message: "Internal server error" });
		}
	};
};
