import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { db } from './db';
import { authSessions, users } from './db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { hashToken, isValidToken, randomToken } from './auth/crypto';
import { SESSION_TTL_MS } from './auth/policy';

const SESSION_COOKIE = 'session';

export async function getUserFromSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	if (!isValidToken(token)) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	const tokenHash = hashToken(token);
	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			translation: users.translation,
			createdAt: users.createdAt
		})
		.from(authSessions)
		.innerJoin(users, eq(authSessions.userId, users.id))
		.where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date())))
		.limit(1);

	if (!rows[0]) {
		await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return rows[0];
}

export async function getSession(cookies: Cookies) {
	const user = await getUserFromSession(cookies);
	if (!user) return null;
	return { user };
}

export async function requireAuth(cookies: Cookies) {
	const session = await getSession(cookies);
	if (!session) redirect(303, '/auth/login');
	return session;
}

export async function createSession(cookies: Cookies, userId: string) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await db.insert(authSessions).values({
		userId,
		tokenHash: hashToken(token),
		expiresAt
	});

	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: Math.floor(SESSION_TTL_MS / 1000)
	});
}

export async function clearSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token && isValidToken(token)) {
		await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
