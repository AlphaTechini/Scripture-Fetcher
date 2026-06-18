import { db } from '$lib/server/db';
import {
	sessions,
	alternatives,
	passages,
	prayerPoints,
	comments,
	versesRead,
	quoteLogs,
	motivationalQuotes
} from '$lib/server/db/schema';
import { eq, desc, sql, and, count } from 'drizzle-orm';

export async function getReadingHistory() {
	const history = await db
		.select({
			sessionId: sessions.id,
			mood: sessions.mood,
			category: sessions.category,
			timeOfDay: sessions.timeOfDay,
			timeOfYear: sessions.timeOfYear,
			currentDateText: sessions.currentDateText,
			createdAt: sessions.createdAt,
			storyTitle: alternatives.storyTitle,
			influenceType: alternatives.influenceType,
			picked: alternatives.picked
		})
		.from(sessions)
		.innerJoin(alternatives, eq(sessions.id, alternatives.sessionId))
		.orderBy(desc(sessions.createdAt))
		.limit(50);

	return history;
}

export async function getPassagesRead() {
	const passagesRead = await db
		.select({
			id: versesRead.id,
			verseReference: versesRead.verseReference,
			sessionId: versesRead.sessionId,
			alternativeId: versesRead.alternativeId,
			markedAt: versesRead.markedAt
		})
		.from(versesRead)
		.orderBy(desc(versesRead.markedAt))
		.limit(100);

	return passagesRead;
}

export async function getComments() {
	const commentsData = await db
		.select({
			id: comments.id,
			content: comments.content,
			sessionId: comments.sessionId,
			createdAt: comments.createdAt
		})
		.from(comments)
		.orderBy(desc(comments.createdAt))
		.limit(50);

	return commentsData;
}

export async function getUsageMetrics() {
	const totalSessions = await db.select({ count: count() }).from(sessions);
	const totalVerses = await db.select({ count: count() }).from(versesRead);
	const totalAlternatives = await db.select({ count: count() }).from(alternatives);

	const readingStreak = await db
		.select({
			streak: sql<number>`COUNT(DISTINCT DATE(${sessions.createdAt}))`
		})
		.from(sessions);

	const categoryDistribution = await db
		.select({
			category: sessions.category,
			count: count()
		})
		.from(sessions)
		.groupBy(sessions.category);

	return {
		totalSessions: totalSessions[0]?.count || 0,
		totalVerses: totalVerses[0]?.count || 0,
		totalAlternatives: totalAlternatives[0]?.count || 0,
		readingStreak: readingStreak[0]?.streak || 0,
		categoryDistribution
	};
}

export async function getSessionDetails(sessionId: string) {
	const sessionData = await db
		.select()
		.from(sessions)
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (sessionData.length === 0) {
		return { error: 'Session not found' };
	}

	const sessionAlts = await db
		.select()
		.from(alternatives)
		.where(eq(alternatives.sessionId, sessionId))
		.orderBy(desc(alternatives.createdAt));

	const altIds = sessionAlts.map((a) => a.id);

	const allPassages = altIds.length > 0
		? await db.select().from(passages).where(eq(passages.alternativeId, altIds[0])).orderBy(passages.orderIndex)
		: [];

	const allPrayerPoints = altIds.length > 0
		? await db.select().from(prayerPoints).where(eq(prayerPoints.alternativeId, altIds[0])).orderBy(prayerPoints.orderIndex)
		: [];

	return {
		session: sessionData[0],
		alternatives: sessionAlts,
		passages: allPassages,
		prayerPoints: allPrayerPoints
	};
}

export async function getQuoteHistory() {
	const history = await db
		.select({
			verseReference: motivationalQuotes.verseReference,
			verseText: motivationalQuotes.verseText,
			shownAt: quoteLogs.shownAt
		})
		.from(quoteLogs)
		.innerJoin(motivationalQuotes, eq(quoteLogs.quoteId, motivationalQuotes.id))
		.orderBy(desc(quoteLogs.shownAt))
		.limit(50);

	return history;
}

export async function getAlternativesByType(influenceType: 'primary' | 'historical' | 'user_directed') {
	const alts = await db
		.select({
			id: alternatives.id,
			label: alternatives.label,
			storyTitle: alternatives.storyTitle,
			storySummary: alternatives.storySummary,
			reasoning: alternatives.reasoning,
			picked: alternatives.picked,
			sessionId: alternatives.sessionId,
			sessionMood: sessions.mood,
			sessionCategory: sessions.category,
			createdAt: alternatives.createdAt
		})
		.from(alternatives)
		.innerJoin(sessions, eq(alternatives.sessionId, sessions.id))
		.where(eq(alternatives.influenceType, influenceType))
		.orderBy(desc(alternatives.createdAt))
		.limit(50);

	return alts;
}

export async function getUnpickedAlternatives(mood: string, category: string) {
	const alts = await db
		.select({
			id: alternatives.id,
			label: alternatives.label,
			storyTitle: alternatives.storyTitle,
			storySummary: alternatives.storySummary,
			reasoning: alternatives.reasoning,
			createdAt: alternatives.createdAt
		})
		.from(alternatives)
		.innerJoin(sessions, eq(alternatives.sessionId, sessions.id))
		.where(
			and(
				eq(sessions.mood, mood),
				eq(sessions.category, category),
				eq(alternatives.picked, false)
			)
		)
		.orderBy(desc(sessions.createdAt))
		.limit(10);

	return alts;
}
