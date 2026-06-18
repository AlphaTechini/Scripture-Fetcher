import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	sessions,
	alternatives,
	versesRead,
	quoteLogs,
	motivationalQuotes
} from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getSession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getSession(cookies);
	if (!session) {
		redirect(303, '/auth/login');
	}

	const userId = session.user.id;

	const userSessions = await db
		.select({
			id: sessions.id,
			mood: sessions.mood,
			category: sessions.category,
			timeOfDay: sessions.timeOfDay,
			timeOfYear: sessions.timeOfYear,
			currentDateText: sessions.currentDateText,
			createdAt: sessions.createdAt,
			storyTitles: sql<string>`array_agg(${alternatives.storyTitle})`.as('storyTitles')
		})
		.from(sessions)
		.leftJoin(alternatives, eq(sessions.id, alternatives.sessionId))
		.where(eq(sessions.userId, userId))
		.groupBy(sessions.id)
		.orderBy(desc(sessions.createdAt));

	const totalVerses = await db
		.select({ count: sql<number>`count(*)` })
		.from(versesRead)
		.where(eq(versesRead.userId, userId));

	const readingStreak = await db
		.select({
			streak: sql<number>`
				COUNT(DISTINCT DATE(${sessions.createdAt}))
			`
		})
		.from(sessions)
		.where(eq(sessions.userId, userId));

	const categoryDistribution = await db
		.select({
			category: sessions.category,
			count: sql<number>`count(*)`
		})
		.from(sessions)
		.where(eq(sessions.userId, userId))
		.groupBy(sessions.category);

	const quoteHistory = await db
		.select({
			verseReference: motivationalQuotes.verseReference,
			verseText: motivationalQuotes.verseText,
			shownAt: quoteLogs.shownAt
		})
		.from(quoteLogs)
		.innerJoin(motivationalQuotes, eq(quoteLogs.quoteId, motivationalQuotes.id))
		.where(eq(quoteLogs.userId, userId))
		.orderBy(desc(quoteLogs.shownAt))
		.limit(50);

	return {
		sessions: userSessions,
		totalVerses: totalVerses[0]?.count || 0,
		readingStreak: readingStreak[0]?.streak || 0,
		categoryDistribution,
		quoteHistory
	};
};
