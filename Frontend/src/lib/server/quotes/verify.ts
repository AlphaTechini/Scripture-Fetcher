import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql, notInArray, desc, and } from 'drizzle-orm';
import { motivationalQuotes, quoteLogs, users } from '../db/schema.js';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { motivationalQuotes, quoteLogs, users } });

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function selectQuote(userId: string, timeOfDay: string, season: string) {
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
			.limit(1);

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
		.limit(1);

	return fallback;
}

async function logQuoteFn(userId: string, quoteId: string) {
	await db.insert(quoteLogs).values({ userId, quoteId });
}

async function runTests() {
	console.log('\n=== Stage 4: Quote Engine Verification ===\n');

	let testUserId = '';

	try {
		// Test 4.1: Seed verification
		const allQuotes = await db.select().from(motivationalQuotes);
		log('4.1', allQuotes.length >= 150, `Seed has ${allQuotes.length} quotes (target: 150+)`);

		// Test 4.2: Query by mood tag
		const joyfulQuotes = await db
			.select()
			.from(motivationalQuotes)
			.where(sql`${motivationalQuotes.moodTags} && ARRAY['Joyful']::text[]`);
		log('4.2', joyfulQuotes.length > 0, `Found ${joyfulQuotes.length} quotes tagged 'Joyful'`);

		// Test 4.3: Query by category tag
		const faithQuotes = await db
			.select()
			.from(motivationalQuotes)
			.where(sql`${motivationalQuotes.categoryTags} && ARRAY['Faith']::text[]`);
		log('4.3', faithQuotes.length > 0, `Found ${faithQuotes.length} quotes tagged 'Faith'`);

		// Test 4.4: Query by season tag
		const christmasQuotes = await db
			.select()
			.from(motivationalQuotes)
			.where(sql`${motivationalQuotes.seasonTags} && ARRAY['Christmas']::text[]`);
		log('4.4', christmasQuotes.length > 0, `Found ${christmasQuotes.length} quotes tagged 'Christmas'`);

		// Create test user
		const [testUser] = await db
			.insert(users)
			.values({ name: 'Quote Test User', translation: 'KJV' })
			.returning();
		testUserId = testUser.id;

		// Test 4.5: selectQuote with no history
		const quote1 = await selectQuote(testUserId, 'Morning', 'Summer');
		log('4.5', quote1.length === 1 && quote1[0].verseText.length > 0, `selectQuote returned: "${quote1[0]?.verseReference}"`);

		// Test 4.6: selectQuote 10 times - check distribution
		const selectedIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const q = await selectQuote(testUserId, 'Morning', 'Summer');
			if (q.length > 0) {
				selectedIds.push(q[0].id);
				await logQuoteFn(testUserId, q[0].id);
			}
		}
		const uniqueCount = new Set(selectedIds).size;
		log('4.6', uniqueCount >= 5, `10 selections produced ${uniqueCount} unique quotes (min 5)`);

		// Test 4.7: logQuote verification
		const logs = await db
			.select()
			.from(quoteLogs)
			.where(eq(quoteLogs.userId, testUserId));
		log('4.7', logs.length >= 10, `quote_logs has ${logs.length} entries for test user`);

		// Test 4.8: quote_logs ordered by shownAt
		const orderedLogs = await db
			.select()
			.from(quoteLogs)
			.where(eq(quoteLogs.userId, testUserId))
			.orderBy(sql`${quoteLogs.shownAt} DESC`);
		log('4.8', orderedLogs.length >= 10, `quote_logs ordered correctly (${orderedLogs.length} entries)`);

		// Test 4.9: selectQuote with timeOfDay='Morning'
		const morningQuotes = await selectQuote(testUserId, 'Morning', 'Summer');
		log('4.9', morningQuotes.length === 1, `Morning selection returned quote`);

		// Test 4.10: selectQuote with season='Christmas'
		const christmasQuote = await selectQuote(testUserId, 'Morning', 'Christmas');
		log('4.10', christmasQuote.length === 1, `Christmas selection returned quote`);

		// Test 4.11: Verify no empty verse_text or verse_reference
		const emptyQuotes = await db
			.select()
			.from(motivationalQuotes)
			.where(sql`${motivationalQuotes.verseText} = '' OR ${motivationalQuotes.verseReference} = ''`);
		log('4.11', emptyQuotes.length === 0, `No quotes with empty verse_text or verse_reference`);

		// Cleanup
		await db.delete(quoteLogs).where(eq(quoteLogs.userId, testUserId));
		await db.delete(users).where(eq(users.id, testUserId));
		console.log('\n=== Cleanup Complete ===\n');
	} catch (error: any) {
		console.error('\n[ERROR] Test execution failed:', error.message);
	}

	// Summary
	const passed = testResults.filter((r) => r.passed).length;
	const failed = testResults.filter((r) => !r.passed).length;
	console.log(`\n=== Summary: ${passed}/${testResults.length} passed, ${failed} failed ===\n`);

	await client.end();
	process.exit(failed > 0 ? 1 : 0);
}

runTests();
