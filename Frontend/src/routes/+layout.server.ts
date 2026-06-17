import type { LayoutServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/db/supabase';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const supabase = createSupabaseServerClient(cookies);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		return {
			user: null
		};
	}

	return {
		user: session.user
	};
};
