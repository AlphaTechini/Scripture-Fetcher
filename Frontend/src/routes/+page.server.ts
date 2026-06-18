import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { selectQuote, logQuote } from '$lib/server/quotes';
import { getSession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getSession(cookies);
	if (!session) {
		redirect(303, '/auth/login');
	}

	const timeOfDay = getTimeOfDay();
	const season = getSeason();

	const quotes = await selectQuote(session.user.id, timeOfDay, season);
	const quote = quotes[0] || null;

	if (quote) {
		await logQuote(session.user.id, quote.id);
	}

	return {
		user: session.user,
		quote,
		timeOfDay,
		timeOfYear: season,
		currentDate: new Date().toISOString().split('T')[0]
	};
};

export const actions: Actions = {
	submit: async ({ request, cookies }) => {
		const session = await getSession(cookies);
		if (!session) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const mood = formData.get('mood') as string;
		const category = formData.get('category') as string;
		const userNotes = formData.get('userNotes') as string;
		const timeOfDay = formData.get('timeOfDay') as string;
		const timeOfYear = formData.get('timeOfYear') as string;
		const currentDate = formData.get('currentDate') as string;

		if (!mood || !category) {
			return fail(400, { error: 'Mood and category are required' });
		}

		const response = await fetch(`${request.headers.get('origin')}/api/scripture`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: request.headers.get('cookie') || ''
			},
			body: JSON.stringify({
				mood,
				category,
				userNotes,
				timeOfDay,
				timeOfYear,
				currentDate
			})
		});

		if (!response.ok) {
			return fail(response.status, { error: 'Failed to generate alternatives' });
		}

		const data = await response.json();
		redirect(303, `/session/${data.sessionId}`);
	}
};

function getTimeOfDay(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) return 'Morning';
	if (hour >= 12 && hour < 17) return 'Afternoon';
	if (hour >= 17 && hour < 21) return 'Evening';
	return 'Night';
}

function getSeason(): string {
	const now = new Date();
	const month = now.getMonth();
	const day = now.getDate();

	if (month === 11 && day >= 20) return 'Christmas';
	if (month === 0 || (month === 11 && day < 20)) return 'Winter';
	if (month >= 2 && month <= 4) return 'Spring';
	if (month >= 5 && month <= 7) return 'Summer';
	return 'Autumn';
}
