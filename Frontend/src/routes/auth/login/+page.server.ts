import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/db/supabase';

export const actions: Actions = {
	signin: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { error: error.message });
		}

		redirect(303, '/');
	},

	signup: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.signUp({ email, password });

		if (error) {
			return fail(400, { error: error.message });
		}

		return {
			success: 'Account created! Check your email to confirm, then sign in.'
		};
	}
};
