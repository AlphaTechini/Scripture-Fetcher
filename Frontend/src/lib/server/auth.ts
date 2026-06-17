import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from './db/supabase';

export async function getSession(cookies: Cookies) {
	const supabase = createSupabaseServerClient(cookies);
	const {
		data: { session }
	} = await supabase.auth.getSession();
	return session;
}

export async function getUser(cookies: Cookies) {
	const supabase = createSupabaseServerClient(cookies);
	const {
		data: { user }
	} = await supabase.auth.getUser();
	return user;
}

export async function requireAuth(cookies: Cookies) {
	const session = await getSession(cookies);
	if (!session) {
		redirect(303, '/auth/login');
	}
	return session;
}
