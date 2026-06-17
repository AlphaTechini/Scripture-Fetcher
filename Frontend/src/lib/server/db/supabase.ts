import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function createSupabaseServerClient(cookies: Cookies) {
	return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

export function createSupabaseAdminClient() {
	return createServerClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
		cookies: {
			getAll() {
				return [];
			},
			setAll() {}
		}
	});
}
