import { db } from '../db';
import { authRateLimits } from '../db/schema';
import { eq, lt } from 'drizzle-orm';
import { authDigest } from './crypto';
import { OTP_EMAIL_SEND_LIMIT, OTP_IP_SEND_LIMIT, OTP_SEND_WINDOW_MS } from './policy';

interface RateLimitResult {
	allowed: boolean;
	retryAfterSeconds: number;
}

async function consumeRateLimit(
	scope: string,
	identifier: string,
	limit: number,
	windowMs: number
): Promise<RateLimitResult> {
	const key = authDigest(`rate-limit:${scope}`, identifier);
	const now = new Date();
	const expiresAt = new Date(now.getTime() + windowMs);

	await db.delete(authRateLimits).where(lt(authRateLimits.expiresAt, now));

	return db.transaction(async (tx) => {
		await tx
			.insert(authRateLimits)
			.values({ key, count: 0, windowStartedAt: now, expiresAt })
			.onConflictDoNothing({ target: authRateLimits.key });

		const [entry] = await tx
			.select()
			.from(authRateLimits)
			.where(eq(authRateLimits.key, key))
			.for('update');

		if (entry.expiresAt.getTime() <= now.getTime()) {
			await tx
				.update(authRateLimits)
				.set({ count: 1, windowStartedAt: now, expiresAt })
				.where(eq(authRateLimits.key, key));
			return { allowed: true, retryAfterSeconds: 0 };
		}

		if (entry.count >= limit) {
			return {
				allowed: false,
				retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt.getTime() - Date.now()) / 1000))
			};
		}

		await tx
			.update(authRateLimits)
			.set({ count: entry.count + 1 })
			.where(eq(authRateLimits.key, key));
		return { allowed: true, retryAfterSeconds: 0 };
	});
}

export async function consumeOtpSendLimits(
	email: string,
	clientAddress: string
): Promise<RateLimitResult> {
	const emailResult = await consumeRateLimit(
		'otp-email',
		email,
		OTP_EMAIL_SEND_LIMIT,
		OTP_SEND_WINDOW_MS
	);
	if (!emailResult.allowed) return emailResult;

	return consumeRateLimit('otp-ip', clientAddress, OTP_IP_SEND_LIMIT, OTP_SEND_WINDOW_MS);
}
