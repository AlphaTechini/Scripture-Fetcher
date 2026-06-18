import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	alternatives,
	sessions,
	passages,
	prayerPoints
} from '$lib/server/db/schema';

export async function findReusableAlternatives(
	userId: string,
	mood: string,
	category: string
) {
	const reusable = await db
		.select({
			alternative: alternatives,
			session: sessions
		})
		.from(alternatives)
		.innerJoin(sessions, eq(alternatives.sessionId, sessions.id))
		.where(
			and(
				eq(sessions.userId, userId),
				eq(sessions.mood, mood),
				eq(sessions.category, category),
				eq(alternatives.picked, false)
			)
		)
		.orderBy(desc(sessions.createdAt))
		.limit(2);

	return reusable.map((r) => r.alternative);
}

export async function copyAlternativeToSession(
	originalAltId: string,
	newSessionId: string
) {
	const original = await db
		.select()
		.from(alternatives)
		.where(eq(alternatives.id, originalAltId))
		.limit(1);

	if (original.length === 0) {
		throw new Error(`Original alternative ${originalAltId} not found`);
	}

	const origAlt = original[0];

	const [newAlt] = await db
		.insert(alternatives)
		.values({
			sessionId: newSessionId,
			label: origAlt.label,
			influenceType: origAlt.influenceType,
			storyTitle: origAlt.storyTitle,
			storySummary: origAlt.storySummary,
			reasoning: origAlt.reasoning,
			picked: false,
			reusedFrom: origAlt.id
		})
		.returning();

	const originalPassages = await db
		.select()
		.from(passages)
		.where(eq(passages.alternativeId, originalAltId))
		.orderBy(passages.orderIndex);

	if (originalPassages.length > 0) {
		await db.insert(passages).values(
			originalPassages.map((p) => ({
				alternativeId: newAlt.id,
				reference: p.reference,
				passageText: p.passageText,
				book: p.book,
				chapter: p.chapter,
				orderIndex: p.orderIndex
			}))
		);
	}

	const originalPrayerPoints = await db
		.select()
		.from(prayerPoints)
		.where(eq(prayerPoints.alternativeId, originalAltId))
		.orderBy(prayerPoints.orderIndex);

	if (originalPrayerPoints.length > 0) {
		await db.insert(prayerPoints).values(
			originalPrayerPoints.map((pp) => ({
				alternativeId: newAlt.id,
				content: pp.content,
				passageRef: pp.passageRef,
				orderIndex: pp.orderIndex
			}))
		);
	}

	return newAlt;
}

export async function pickAlternative(alternativeId: string) {
	const [updated] = await db
		.update(alternatives)
		.set({ picked: true })
		.where(eq(alternatives.id, alternativeId))
		.returning();

	return updated;
}
