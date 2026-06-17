import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/db/supabase';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const supabase = createSupabaseServerClient(cookies);
		await supabase.auth.exchangeCodeForSession(code);
	}

	redirect(303, '/');
};
