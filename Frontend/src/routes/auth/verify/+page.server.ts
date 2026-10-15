import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession } from '$lib/server/auth';
import { consumeOtpSendLimits } from '$lib/server/auth/rate-limit';
import {
	clearVerificationFlowCookie,
	completeEmailVerification,
	getVerificationFlow,
	getVerificationFlowToken,
	prepareVerificationResend,
	setVerificationFlowCookie
} from '$lib/server/auth/verification';
import { sendOtpEmail } from '$lib/server/auth/verification-email';

export const load: PageServerLoad = async ({ cookies }) => {
	const flowToken = getVerificationFlowToken(cookies);
	if (!flowToken) redirect(303, '/auth/login');
	const verification = await getVerificationFlow(flowToken);
	if (!verification) redirect(303, '/auth/login');

	return { email: verification.email };
};

export const actions: Actions = {
	verify: async ({ request, cookies }) => {
		const formData = await request.formData();
		const codeValue = formData.get('code');
		const code = typeof codeValue === 'string' ? codeValue.trim() : '';

		if (!code) {
			return fail(400, { error: 'Verification code is required' });
		}

		if (!/^\d{6}$/.test(code)) {
			return fail(400, { error: 'Code must be 6 digits' });
		}

		const flowToken = getVerificationFlowToken(cookies);
		if (!flowToken)
			return fail(400, { error: 'Verification session expired. Please sign up again.' });

		const result = await completeEmailVerification(flowToken, code);
		if (result.status === 'invalid') {
			return fail(400, {
				error: `Invalid code. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining.`
			});
		}
		if (result.status === 'expired') {
			return fail(400, { error: 'Code expired. Request a new one.' });
		}
		if (result.status === 'attempts_exceeded') {
			return fail(429, { error: 'Too many invalid attempts. Request a new code.' });
		}
		if (result.status === 'account_exists') {
			clearVerificationFlowCookie(cookies);
			return fail(409, { error: 'An account already exists for this email. Please sign in.' });
		}
		if (result.status === 'missing') {
			clearVerificationFlowCookie(cookies);
			return fail(400, { error: 'Verification session expired. Please sign up again.' });
		}

		clearVerificationFlowCookie(cookies);
		await createSession(cookies, result.userId);
		redirect(303, '/');
	},

	resend: async ({ cookies, getClientAddress, setHeaders }) => {
		const flowToken = getVerificationFlowToken(cookies);
		if (!flowToken)
			return fail(400, { error: 'Verification session expired. Please sign up again.' });
		const verification = await getVerificationFlow(flowToken);
		if (!verification)
			return fail(400, { error: 'Verification session expired. Please sign up again.' });

		const rateLimit = await consumeOtpSendLimits(verification.email, getClientAddress());
		if (!rateLimit.allowed) {
			setHeaders({ 'Retry-After': String(rateLimit.retryAfterSeconds) });
			return fail(429, { error: 'Too many verification emails. Please try again later.' });
		}

		const prepared = await prepareVerificationResend(flowToken);
		if (!prepared || prepared.status === 'missing')
			return fail(400, { error: 'Verification session expired. Please sign up again.' });
		if (prepared.status === 'cooldown') {
			setHeaders({ 'Retry-After': String(prepared.retryAfterSeconds) });
			return fail(429, { error: 'Please wait before requesting another verification code.' });
		}

		try {
			await sendOtpEmail(prepared.email, prepared.code);
		} catch {
			console.error('[auth] Verification email delivery failed');
			return fail(500, { error: 'Could not resend code. Please try again.' });
		}

		setVerificationFlowCookie(cookies, flowToken);
		return { success: 'A new verification code has been sent.' };
	}
};
