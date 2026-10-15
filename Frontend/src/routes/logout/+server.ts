import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	await clearSession(cookies);
	redirect(303, '/auth/login');
};
