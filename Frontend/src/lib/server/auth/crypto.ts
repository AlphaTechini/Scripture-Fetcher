import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function getAuthSecret(): string {
	const secret = env.SESSION_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error('SESSION_SECRET must contain at least 32 characters');
	}
	return secret;
}

export function randomToken(): string {
	return randomBytes(32).toString('base64url');
}

export function isValidToken(token: string): boolean {
	return TOKEN_PATTERN.test(token);
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function authDigest(purpose: string, value: string): string {
	return createHmac('sha256', getAuthSecret())
		.update(purpose)
		.update('\0')
		.update(value)
		.digest('hex');
}

export function safeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
