import type { LayoutServerLoad } from './$types';
import { getSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const session = await getSession(cookies);
	return {
		user: session?.user ?? null
	};
};
