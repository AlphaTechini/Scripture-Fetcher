import type { Cookies } from '@sveltejs/kit';
import { randomInt } from 'crypto';
import { db } from '../db';
import { emailVerifications, users } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { authDigest, hashToken, isValidToken, randomToken, safeEqual } from './crypto';
import {
	OTP_MAX_ATTEMPTS,
	OTP_RESEND_COOLDOWN_MS,
	OTP_TTL_MS,
	VERIFICATION_FLOW_TTL_S
} from './policy';

const VERIFICATION_FLOW_COOKIE = 'verification_flow';

function generateOtp(): string {
	return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashOtp(email: string, code: string): string {
	return authDigest('email-otp', `${email}\0${code}`);
}

function getCooldownSeconds(lastSentAt: Date | null): number {
	if (!lastSentAt) return 0;
	return Math.max(
		0,
		Math.ceil((lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000)
	);
}

export function getVerificationFlowToken(cookies: Cookies): string | null {
	const token = cookies.get(VERIFICATION_FLOW_COOKIE);
	return token && isValidToken(token) ? token : null;
}

export function setVerificationFlowCookie(cookies: Cookies, token: string): void {
	cookies.set(VERIFICATION_FLOW_COOKIE, token, {
		path: '/auth/verify',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: VERIFICATION_FLOW_TTL_S
	});
}

export function clearVerificationFlowCookie(cookies: Cookies): void {
	cookies.delete(VERIFICATION_FLOW_COOKIE, { path: '/auth/verify' });
}

export async function getVerificationFlow(token: string) {
	if (!isValidToken(token)) return null;
	const rows = await db
		.select({ email: emailVerifications.email, lastSentAt: emailVerifications.lastSentAt })
		.from(emailVerifications)
		.where(eq(emailVerifications.flowTokenHash, hashToken(token)))
		.limit(1);
	return rows[0] ?? null;
}

type PrepareResult =
	| { status: 'ready'; email: string; code: string; flowToken: string }
	| { status: 'cooldown'; retryAfterSeconds: number }
	| { status: 'missing' };

export async function prepareEmailVerification(
	email: string,
	passwordHash: string
): Promise<PrepareResult> {
	const code = generateOtp();
	const flowToken = randomToken();
	const now = new Date();
	const values = {
		email,
		emailKey: authDigest('verification-email', email),
		legacyCode: '',
		codeHash: hashOtp(email, code),
		flowTokenHash: hashToken(flowToken),
		passwordHash,
		attempts: 0,
		lastSentAt: now,
		expiresAt: new Date(now.getTime() + OTP_TTL_MS)
	};

	const inserted = await db
		.insert(emailVerifications)
		.values(values)
		.onConflictDoNothing({ target: emailVerifications.emailKey })
		.returning({ id: emailVerifications.id });

	if (inserted[0]) return { status: 'ready', email, code, flowToken };

	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(emailVerifications)
			.where(eq(emailVerifications.emailKey, values.emailKey))
			.for('update');

		if (!existing) return { status: 'missing' };

		const retryAfterSeconds = getCooldownSeconds(existing.lastSentAt);
		if (retryAfterSeconds > 0) return { status: 'cooldown', retryAfterSeconds };

		await tx.update(emailVerifications).set(values).where(eq(emailVerifications.id, existing.id));
		return { status: 'ready', email, code, flowToken };
	});
}

export async function cancelEmailVerification(flowToken: string): Promise<void> {
	if (!isValidToken(flowToken)) return;
	await db
		.delete(emailVerifications)
		.where(eq(emailVerifications.flowTokenHash, hashToken(flowToken)));
}

export async function prepareVerificationResend(flowToken: string): Promise<PrepareResult | null> {
	if (!isValidToken(flowToken)) return null;
	const flowTokenHash = hashToken(flowToken);

	return db.transaction(async (tx) => {
		const [verification] = await tx
			.select()
			.from(emailVerifications)
			.where(eq(emailVerifications.flowTokenHash, flowTokenHash))
			.for('update');
		if (!verification) return null;

		const retryAfterSeconds = getCooldownSeconds(verification.lastSentAt);
		if (retryAfterSeconds > 0) return { status: 'cooldown', retryAfterSeconds };

		const code = generateOtp();
		const now = new Date();
		await tx
			.update(emailVerifications)
			.set({
				codeHash: hashOtp(verification.email, code),
				attempts: 0,
				lastSentAt: now,
				expiresAt: new Date(now.getTime() + OTP_TTL_MS)
			})
			.where(eq(emailVerifications.id, verification.id));

		return { status: 'ready', email: verification.email, code, flowToken };
	});
}

export type VerificationResult =
	| { status: 'verified'; userId: string }
	| { status: 'invalid'; attemptsRemaining: number }
	| { status: 'expired' }
	| { status: 'attempts_exceeded' }
	| { status: 'missing' }
	| { status: 'account_exists' };

export async function completeEmailVerification(
	flowToken: string,
	code: string
): Promise<VerificationResult> {
	if (!isValidToken(flowToken)) return { status: 'missing' };
	const flowTokenHash = hashToken(flowToken);

	return db.transaction(async (tx) => {
		const [verification] = await tx
			.select()
			.from(emailVerifications)
			.where(eq(emailVerifications.flowTokenHash, flowTokenHash))
			.for('update');
		if (!verification?.codeHash) return { status: 'missing' };
		if (verification.expiresAt.getTime() <= Date.now()) return { status: 'expired' };
		if (verification.attempts >= OTP_MAX_ATTEMPTS) return { status: 'attempts_exceeded' };

		const valid = safeEqual(verification.codeHash, hashOtp(verification.email, code));
		if (!valid) {
			const attempts = verification.attempts + 1;
			await tx
				.update(emailVerifications)
				.set({ attempts })
				.where(eq(emailVerifications.id, verification.id));
			return attempts >= OTP_MAX_ATTEMPTS
				? { status: 'attempts_exceeded' }
				: { status: 'invalid', attemptsRemaining: OTP_MAX_ATTEMPTS - attempts };
		}

		const name = verification.email.split('@')[0] || 'Scholar';
		const [user] = await tx
			.insert(users)
			.values({ name, email: verification.email, password: verification.passwordHash })
			.onConflictDoNothing({ target: users.email })
			.returning({ id: users.id });

		await tx
			.delete(emailVerifications)
			.where(
				and(
					eq(emailVerifications.id, verification.id),
					eq(emailVerifications.flowTokenHash, flowTokenHash)
				)
			);

		return user ? { status: 'verified', userId: user.id } : { status: 'account_exists' };
	});
}
