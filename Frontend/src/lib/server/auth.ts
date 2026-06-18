import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { SESSION_SECRET } from '$env/dynamic/private';

const SESSION_COOKIE = 'session';

function signCookie(value: string): string {
	const hmac = createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
	return `${value}.${hmac}`;
}

function unsignCookie(signed: string): string | null {
	const [value, hmac] = signed.split('.');
	if (!value || !hmac) return null;
	const expected = createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
	if (!timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;
	return value;
}

export async function getUserFromSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const userId = unsignCookie(token);
	if (!userId) return null;
	const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	return rows[0] ?? null;
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
	const token = signCookie(userId);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: import.meta.env.PROD,
		maxAge: 60 * 60 * 24 * 7
	});
}

export function clearSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}
