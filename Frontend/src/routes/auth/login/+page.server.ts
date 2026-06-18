import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, getSession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getSession(cookies);
	if (session) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	signin: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
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

	signup: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existing.length > 0) {
			return fail(400, { error: 'Email already in use' });
		}

		const passwordHash = await hashPassword(password);
		const name = email.split('@')[0] || 'Scholar';

		const [user] = await db
			.insert(users)
			.values({ name, email, password: passwordHash })
			.returning();

		await createSession(cookies, user.id);
		redirect(303, '/');
	}
};
