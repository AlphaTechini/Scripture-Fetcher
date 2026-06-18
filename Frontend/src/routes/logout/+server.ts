import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/db/supabase';

export const POST: RequestHandler = async ({ cookies }) => {
	const supabase = createSupabaseServerClient(cookies);
	await supabase.auth.signOut();
	redirect(303, '/auth/login');
};
