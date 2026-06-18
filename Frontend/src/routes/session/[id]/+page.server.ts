import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	sessions,
	alternatives,
	passages,
	prayerPoints,
	comments,
	versesRead,
	bookmarks
} from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getSession } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const session = await getSession(cookies);
	if (!session) {
		redirect(303, '/auth/login');
	}

	const sessionId = params.id;

	const sessionData = await db
		.select()
		.from(sessions)
		.where(and(eq(sessions.id, sessionId), eq(sessions.userId, session.user.id)))
		.limit(1);

	if (sessionData.length === 0) {
		redirect(303, '/');
	}

	const sessionAlts = await db
		.select()
		.from(alternatives)
		.where(eq(alternatives.sessionId, sessionId))
		.orderBy(desc(alternatives.createdAt));

	const altIds = sessionAlts.map((a) => a.id);

	const allPassages = altIds.length > 0
		? await db.select().from(passages).where(inArray(passages.alternativeId, altIds)).orderBy(passages.orderIndex)
		: [];

	const allPrayerPoints = altIds.length > 0
		? await db.select().from(prayerPoints).where(inArray(prayerPoints.alternativeId, altIds)).orderBy(prayerPoints.orderIndex)
		: [];

	const sessionComments = await db
		.select()
		.from(comments)
		.where(eq(comments.sessionId, sessionId))
		.orderBy(desc(comments.createdAt));

	const sessionVerses = await db
		.select()
		.from(versesRead)
		.where(eq(versesRead.sessionId, sessionId));

	const sessionBookmarks = await db
		.select()
		.from(bookmarks)
		.where(eq(bookmarks.sessionId, sessionId));

	return {
		session: sessionData[0],
		alternatives: sessionAlts,
		passages: allPassages,
		prayerPoints: allPrayerPoints,
		comments: sessionComments,
		versesRead: sessionVerses,
		isBookmarked: sessionBookmarks.length > 0
	};
};

export const actions: Actions = {
	pick: async ({ request, cookies }) => {
		const session = await getSession(cookies);
		if (!session) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const alternativeId = formData.get('alternativeId') as string;

		await db
			.update(alternatives)
			.set({ picked: true })
			.where(eq(alternatives.id, alternativeId));

		return { success: true };
	},

	comment: async ({ request, cookies, params }) => {
		const session = await getSession(cookies);
		if (!session) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const content = formData.get('content') as string;

		if (!content || content.trim().length === 0) {
			return { success: true };
		}

		await db.insert(comments).values({
			sessionId: params.id,
			userId: session.user.id,
			content: content.trim()
		});

		return { success: true };
	},

	markVerse: async ({ request, cookies, params }) => {
		const session = await getSession(cookies);
		if (!session) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const verseReferences = formData.getAll('verseReference') as string[];
		const alternativeId = formData.get('alternativeId') as string | null;

		await db.delete(versesRead).where(
			and(eq(versesRead.sessionId, params.id), eq(versesRead.userId, session.user.id))
		);

		if (verseReferences.length > 0) {
			await db.insert(versesRead).values(
				verseReferences.map((ref) => ({
					userId: session.user.id,
					sessionId: params.id,
					alternativeId: alternativeId || null,
					verseReference: ref
				}))
			);
		}

		return { success: true };
	},

	bookmark: async ({ cookies, params }) => {
		const session = await getSession(cookies);
		if (!session) return fail(401, { error: 'Unauthorized' });

		const existing = await db
			.select()
			.from(bookmarks)
			.where(and(eq(bookmarks.sessionId, params.id), eq(bookmarks.userId, session.user.id)))
			.limit(1);

		if (existing.length === 0) {
			await db.insert(bookmarks).values({
				userId: session.user.id,
				sessionId: params.id
			});
		}

		return { success: true };
	}
};
