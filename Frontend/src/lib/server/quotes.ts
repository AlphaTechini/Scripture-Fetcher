import { eq, and, notInArray, inArray, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { motivationalQuotes, quoteLogs } from '$lib/server/db/schema';

export async function selectQuote(
	userId: string,
	timeOfDay: string,
	season: string,
	limit = 1
) {
	const recentLogs = await db
		.select({ quoteId: quoteLogs.quoteId })
		.from(quoteLogs)
		.where(eq(quoteLogs.userId, userId))
		.orderBy(desc(quoteLogs.shownAt))
		.limit(50);

	const recentQuoteIds = recentLogs.map((log) => log.quoteId);

	let timeTags: string[] = [];
	if (timeOfDay === 'Morning') timeTags = ['Morning', 'New Day', 'Strength', 'Hope'];
	else if (timeOfDay === 'Afternoon') timeTags = ['Work', 'Perseverance', 'Wisdom'];
	else if (timeOfDay === 'Evening') timeTags = ['Peace', 'Rest', 'Gratitude', 'Reflection'];
	else if (timeOfDay === 'Night') timeTags = ['Peace', 'Rest', 'Trust', 'Comfort'];

	let seasonTags: string[] = [];
	if (season === 'Christmas' || season === 'Advent') seasonTags = ['Christmas', 'Hope', 'Incarnation'];
	else if (season === 'Easter' || season === 'Lent') seasonTags = ['Easter', 'Sacrifice', 'Redemption'];
	else if (season === 'New Year') seasonTags = ['New Beginnings', 'Hope', 'Purpose'];

	const allTags = [...timeTags, ...seasonTags];

	if (allTags.length > 0) {
		const taggedQuotes = await db
			.select()
			.from(motivationalQuotes)
			.where(
				and(
					sql`(${motivationalQuotes.moodTags} && ${sql`ARRAY[${sql.join(allTags, sql`, `)}]`}::text[])`,
					recentQuoteIds.length > 0
						? notInArray(motivationalQuotes.id, recentQuoteIds)
						: sql`true`
				)
			)
			.limit(limit);

		if (taggedQuotes.length > 0) return taggedQuotes;
	}

	const fallback = await db
		.select()
		.from(motivationalQuotes)
		.where(
			recentQuoteIds.length > 0
				? notInArray(motivationalQuotes.id, recentQuoteIds)
				: sql`true`
		)
		.orderBy(sql`RANDOM()`)
		.limit(limit);

	return fallback;
}

export async function logQuote(userId: string, quoteId: string) {
	await db.insert(quoteLogs).values({
		userId,
		quoteId
	});
}
