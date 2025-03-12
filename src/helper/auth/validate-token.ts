import { fromUnixTime, getUnixTime } from "date-fns";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { refreshTokens, sessions } from "../../db/schema/auth";
import { env } from "../../env";

export const decryptToken = async (token: string) => {
	try {
		return await jwt.verify(token, env.BACKEND_AUTH_PRIVATE_KEY);
	} catch (_) {
		return null;
	}
};

export const isAccessTokenValidated = async ({
	accessToken,
	returnDecoded = false,
}: {
	accessToken: string;
	returnDecoded: boolean;
}): Promise<{
	decodedAccessToken: string | jwt.JwtPayload | null;
	isTokenValid: boolean;
}> => {
	const decodedAccessToken = await decryptToken(accessToken);

	return returnDecoded
		? { decodedAccessToken, isTokenValid: !!decodedAccessToken }
		: { decodedAccessToken: null, isTokenValid: !!decodedAccessToken };
};

export const isRefreshTokenValidated = async (
	refreshToken: string,
): Promise<boolean> => {
	if (!refreshToken) return false;

	// Validate token structure
	const decodedRefreshToken = await decryptToken(refreshToken);
	if (!decodedRefreshToken) return false;

	const now = fromUnixTime(getUnixTime(new Date()));

	// Check if the refresh token is associated with an expired or revoked session
	const sessionRecord = await db
		.select({
			notAfter: sessions.notAfter,
			revoked: refreshTokens.revoked,
		})
		.from(refreshTokens)
		.innerJoin(sessions, eq(refreshTokens.sessionId, sessions.id))
		.where(eq(refreshTokens.token, refreshToken))
		.limit(1);

	if (sessionRecord.length === 0) return false; // Token not found

	const { notAfter, revoked } = sessionRecord[0];

	// Check if session is expired
	if (notAfter < now) return false;

	// Check if refresh token is revoked
	if (revoked) return false;

	return true;
};
