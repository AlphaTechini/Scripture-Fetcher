import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { generateAlternatives } from '$lib/server/ai';
import { findReusableAlternatives, copyAlternativeToSession } from '$lib/server/reuse';
import { db } from '$lib/server/db';
import { sessions, alternatives, passages, prayerPoints } from '$lib/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = await getSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { mood, category, userNotes } = body;

	if (!mood || !category) {
		return json({ error: 'mood and category are required' }, { status: 400 });
	}

	const timeOfDay = body.timeOfDay || 'Morning';
	const timeOfYear = body.timeOfYear || 'Summer';
	const currentDate = body.currentDate || new Date().toISOString().split('T')[0];

	// Find reusable alternatives
	const reusable = await findReusableAlternatives(session.user.id, mood, category);

	// Create session
	const [newSession] = await db
		.insert(sessions)
		.values({
			userId: session.user.id,
			mood,
			category,
			timeOfDay,
			timeOfYear,
			currentDateText: currentDate,
			userNotes: userNotes || null
		})
		.returning();

	// Copy reused alternatives
	const reusedAlts = reusable.slice(0, 2);
	for (const alt of reusedAlts) {
		await copyAlternativeToSession(alt.id, newSession.id);
	}

	const reusedCount = reusedAlts.length;
	const freshNeeded = 3 - reusedCount;

	if (freshNeeded > 0) {
		// Build reading history from DB
		const recentSessions = await db
			.select({
				storyTitle: alternatives.storyTitle,
				category: sessions.category,
				book: passages.book
			})
			.from(sessions)
			.innerJoin(alternatives, eq(sessions.id, alternatives.sessionId))
			.leftJoin(passages, eq(alternatives.id, passages.alternativeId))
			.where(eq(sessions.userId, session.user.id))
			.orderBy(desc(sessions.createdAt))
			.limit(20);

		const readingHistory = {
			stories: [...new Set(recentSessions.map((s) => s.storyTitle).filter(Boolean))] as string[],
			topics: [...new Set(recentSessions.map((s) => s.category).filter(Boolean))] as string[],
			books: [...new Set(recentSessions.map((s) => s.book).filter(Boolean))] as string[]
		};

		const freshAlternatives = await generateAlternatives({
			mood,
			category,
			timeOfDay,
			timeOfYear,
			currentDate,
			userNotes,
			readingHistory
		});

		for (let i = 0; i < freshNeeded && i < freshAlternatives.length; i++) {
			const alt = freshAlternatives[i];
			const [newAlt] = await db
				.insert(alternatives)
				.values({
					sessionId: newSession.id,
					label: alt.label,
					influenceType: alt.influenceType,
					storyTitle: alt.storyTitle,
					storySummary: alt.storySummary,
					reasoning: alt.reasoning,
					picked: false
				})
				.returning();

			if (alt.passages.length > 0) {
				await db.insert(passages).values(
					alt.passages.map((p) => ({
						alternativeId: newAlt.id,
						reference: p.reference,
						passageText: p.passageText,
						book: p.book,
						chapter: p.chapter,
						orderIndex: p.orderIndex
					}))
				);
			}

			if (alt.prayerPoints.length > 0) {
				await db.insert(prayerPoints).values(
					alt.prayerPoints.map((pp) => ({
						alternativeId: newAlt.id,
						content: pp.content,
						passageRef: pp.passageRef,
						orderIndex: pp.orderIndex
					}))
				);
			}
		}
	}

	return json({ sessionId: newSession.id }, { status: 201 });
};
