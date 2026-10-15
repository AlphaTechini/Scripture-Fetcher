import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, getSession } from '$lib/server/auth';
import { hashPassword, validatePassword, verifyPassword } from '$lib/server/auth/password';
import { parseEmail } from '$lib/server/auth/input';
import { consumeOtpSendLimits } from '$lib/server/auth/rate-limit';
import {
	cancelEmailVerification,
	prepareEmailVerification,
	setVerificationFlowCookie
} from '$lib/server/auth/verification';
import { sendOtpEmail } from '$lib/server/auth/verification-email';

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getSession(cookies);
	if (session) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	signin: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = parseEmail(formData.get('email'));
		const password = formData.get('password');

		if (!email || typeof password !== 'string' || !password) {
			return fail(400, { error: 'A valid email and password are required' });
		}

		const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
		const user = rows[0];
		if (!user || !user.password) {
			return fail(400, { error: 'Invalid email or password' });
		}

		const valid = await verifyPassword(password, user.password);
		if (!valid) {
			return fail(400, { error: 'Invalid email or password' });
		}

		await createSession(cookies, user.id);
		redirect(303, '/');
	},

	signup: async ({ request, cookies, getClientAddress, setHeaders }) => {
		const formData = await request.formData();
		const email = parseEmail(formData.get('email'));
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');

		if (!email || typeof password !== 'string' || !password) {
			return fail(400, { error: 'A valid email and password are required' });
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			return fail(400, { error: passwordError });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existing.length > 0) {
			return fail(400, { error: 'Email already in use' });
		}

		const rateLimit = await consumeOtpSendLimits(email, getClientAddress());
		if (!rateLimit.allowed) {
			setHeaders({ 'Retry-After': String(rateLimit.retryAfterSeconds) });
			return fail(429, { error: 'Too many verification emails. Please try again later.' });
		}

		const passwordHash = await hashPassword(password);
		const prepared = await prepareEmailVerification(email, passwordHash);
		if (prepared.status === 'missing') {
			return fail(500, { error: 'Could not start verification. Please try again.' });
		}
		if (prepared.status === 'cooldown') {
			setHeaders({ 'Retry-After': String(prepared.retryAfterSeconds) });
			return fail(429, { error: 'Please wait before requesting another verification code.' });
		}

		try {
			await sendOtpEmail(prepared.email, prepared.code);
		} catch {
			await cancelEmailVerification(prepared.flowToken);
			console.error('[auth] Verification email delivery failed');
			return fail(500, { error: 'Could not send verification code. Please try again.' });
		}

		setVerificationFlowCookie(cookies, prepared.flowToken);
		redirect(303, '/auth/verify');
	}
};
