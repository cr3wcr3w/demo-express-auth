import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { refreshTokens, sessions } from "../../db/schema/auth";
import { env } from "../../env";

export const decryptToken = async (token: string) => {
	try {
		return jwt.verify(token, env.BACKEND_AUTH_PRIVATE_KEY);
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

export const isRefreshTokenValidated = async ({
	refreshToken,
	returnDecoded = false,
}: {
	refreshToken: string;
	returnDecoded: boolean;
}): Promise<{
	decodedRefreshToken: string | jwt.JwtPayload | null;
	isTokenValid: boolean;
}> => {
	const decodedRefreshToken = await decryptToken(refreshToken);
	if (!decodedRefreshToken)
		return { decodedRefreshToken: null, isTokenValid: false };

	const nowResult = await db.execute(sql`SELECT NOW() AS current_timestamp`);
	const now = new Date(nowResult.rows[0].current_timestamp);

	const sessionRecord = await db
		.select({
			notAfter: sessions.notAfter,
			revoked: refreshTokens.revoked,
		})
		.from(refreshTokens)
		.innerJoin(sessions, eq(refreshTokens.sessionId, sessions.id))
		.where(eq(refreshTokens.token, refreshToken))
		.limit(1);

	if (sessionRecord.length === 0)
		return { decodedRefreshToken: null, isTokenValid: false };

	const { notAfter, revoked } = sessionRecord[0];

	if (notAfter < now) return { decodedRefreshToken: null, isTokenValid: false };

	if (revoked) return { decodedRefreshToken: null, isTokenValid: false };

	return returnDecoded
		? { decodedRefreshToken, isTokenValid: true }
		: { decodedRefreshToken: null, isTokenValid: true };
};
