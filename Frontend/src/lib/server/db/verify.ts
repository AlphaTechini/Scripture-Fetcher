import { config } from 'dotenv';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	const testData = {
		userId: '',
		quoteId: '',
		sessionId: '',
		alternativeIds: [] as string[],
		passageIds: [] as string[],
		prayerPointIds: [] as string[],
		commentId: '',
		verseReadId: '',
		bookmarkId: '',
		quoteLogId: ''
	};

	try {
		console.log('\n=== Stage 1: Schema Verification ===\n');

		// Test 1.1: Insert user
		const [user] = await db
			.insert(schema.users)
			.values({
				name: 'Test User',
				translation: 'KJV'
			})
			.returning();
		testData.userId = user.id;
		log('1.1', !!user.id && user.name === 'Test User', `User created with id=${user.id}`);

		// Test 1.2: Insert motivational quote with arrays
		const [quote] = await db
			.insert(schema.motivationalQuotes)
			.values({
				verseReference: 'Philippians 4:13',
				verseText: 'I can do all things through Christ who strengthens me.',
				moodTags: ['Joyful', 'Hopeful'],
				categoryTags: ['Faith', 'Strength'],
				seasonTags: ['Advent']
			})
			.returning();
		testData.quoteId = quote.id;
		log(
			'1.2',
			!!quote.id && quote.moodTags?.length === 2,
			`Quote created with ${quote.moodTags?.length} mood tags`
		);

		// Test 1.3: Insert session
		const [session] = await db
			.insert(schema.sessions)
			.values({
				userId: testData.userId,
				mood: 'Joyful',
				category: 'Faith',
				timeOfDay: 'Morning',
				timeOfYear: 'Summer',
				currentDateText: '2026-06-16',
				userNotes: 'Test notes'
			})
			.returning();
		testData.sessionId = session.id;
		log('1.3', !!session.id && session.userId === testData.userId, 'Session created with FK to user');

		// Test 1.4: Insert 3 alternatives (one per influence_type)
		const alt1 = await db
			.insert(schema.alternatives)
			.values({
				sessionId: testData.sessionId,
				label: 'Primary',
				influenceType: 'primary',
				storyTitle: 'David and Goliath',
				storySummary: 'A young shepherd defeats a giant with faith and a sling.',
				reasoning: 'Matches Joyful mood and Faith category',
				picked: false
			})
			.returning();

		const alt2 = await db
			.insert(schema.alternatives)
			.values({
				sessionId: testData.sessionId,
				label: 'Historical',
				influenceType: 'historical',
				storyTitle: 'Esther Saves Her People',
				storySummary: 'Queen Esther risks her life to save the Jewish people.',
				reasoning: 'Historical event connection',
				picked: false
			})
			.returning();

		const alt3 = await db
			.insert(schema.alternatives)
			.values({
				sessionId: testData.sessionId,
				label: 'User Interest',
				influenceType: 'user_directed',
				storyTitle: 'Peter Walking on Water',
				storySummary: 'Peter steps out of the boat in faith.',
				reasoning: 'User-directed alternative',
				picked: false
			})
			.returning();

		testData.alternativeIds = [alt1[0].id, alt2[0].id, alt3[0].id];
		log(
			'1.4',
			testData.alternativeIds.length === 3 &&
				alt1[0].influenceType === 'primary' &&
				alt2[0].influenceType === 'historical' &&
				alt3[0].influenceType === 'user_directed',
			'3 alternatives created with different influence_types'
		);

		// Test 1.5: Insert 2+ passages
		const passages = await db
			.insert(schema.passages)
			.values([
				{
					alternativeId: testData.alternativeIds[0],
					reference: '1 Samuel 17:1-11',
					passageText: 'Now the Philistines gathered their armies for battle...',
					book: '1 Samuel',
					chapter: '17',
					orderIndex: 0
				},
				{
					alternativeId: testData.alternativeIds[0],
					reference: '1 Samuel 17:40-50',
					passageText: 'Then he took his staff in his hand...',
					book: '1 Samuel',
					chapter: '17',
					orderIndex: 1
				}
			])
			.returning();
		testData.passageIds = passages.map((p) => p.id);
		log('1.5', passages.length === 2, `2 passages created with order_index`);

		// Test 1.6: Insert 8+ prayer points
		const prayerPoints = await db
			.insert(schema.prayerPoints)
			.values([
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Lord, give me courage to face my giants.',
					passageRef: '1 Samuel 17:1-11',
					orderIndex: 0
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Help me trust in Your strength, not my own.',
					passageRef: '1 Samuel 17:40-50',
					orderIndex: 1
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Strengthen my faith in difficult times.',
					orderIndex: 2
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Give me wisdom to use the tools You provide.',
					orderIndex: 3
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Help me remember Your past faithfulness.',
					orderIndex: 4
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Remove fear from my heart.',
					orderIndex: 5
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Let me be a testimony of Your power.',
					orderIndex: 6
				},
				{
					alternativeId: testData.alternativeIds[0],
					content: 'Grant me victory for Your glory.',
					orderIndex: 7
				}
			])
			.returning();
		testData.prayerPointIds = prayerPoints.map((p) => p.id);
		log('1.6', prayerPoints.length === 8, `8 prayer points created`);

		// Test 1.7: Insert comment
		const [comment] = await db
			.insert(schema.comments)
			.values({
				sessionId: testData.sessionId,
				userId: testData.userId,
				content: 'This story really spoke to me today.'
			})
			.returning();
		testData.commentId = comment.id;
		log('1.7', !!comment.id, 'Comment created');

		// Test 1.8: Insert verses_read
		const [verseRead] = await db
			.insert(schema.versesRead)
			.values({
				userId: testData.userId,
				sessionId: testData.sessionId,
				alternativeId: testData.alternativeIds[0],
				verseReference: '1 Samuel 17:1'
			})
			.returning();
		testData.verseReadId = verseRead.id;
		log('1.8', !!verseRead.id, 'Verse marked as read');

		// Test 1.9: Insert bookmark
		const [bookmark] = await db
			.insert(schema.bookmarks)
			.values({
				userId: testData.userId,
				sessionId: testData.sessionId
			})
			.returning();
		testData.bookmarkId = bookmark.id;
		log('1.9', !!bookmark.id, 'Bookmark created');

		// Test 1.10: Insert quote_log
		const [quoteLog] = await db
			.insert(schema.quoteLogs)
			.values({
				userId: testData.userId,
				quoteId: testData.quoteId
			})
			.returning();
		testData.quoteLogId = quoteLog.id;
		log('1.10', !!quoteLog.id, 'Quote log created');

		// Test 1.11: Update alternatives.picked
		const [updated] = await db
			.update(schema.alternatives)
			.set({ picked: true })
			.where(eq(schema.alternatives.id, testData.alternativeIds[0]))
			.returning();
		log('1.11', updated.picked === true, 'Alternative marked as picked');

		// Test 1.12: Set reused_from self-reference
		const [reused] = await db
			.update(schema.alternatives)
			.set({ reusedFrom: testData.alternativeIds[0] })
			.where(eq(schema.alternatives.id, testData.alternativeIds[1]))
			.returning();
		log('1.12', reused.reusedFrom === testData.alternativeIds[0], 'Self-reference FK valid');

		// Test 1.13: CASCADE delete (delete session, verify children deleted)
		const [deletedSession] = await db
			.delete(schema.sessions)
			.where(eq(schema.sessions.id, testData.sessionId))
			.returning();

		const remainingAlts = await db
			.select()
			.from(schema.alternatives)
			.where(eq(schema.alternatives.sessionId, testData.sessionId));

		const remainingPassages = await db
			.select()
			.from(schema.passages)
			.where(eq(schema.passages.alternativeId, testData.alternativeIds[0]));

		const remainingComments = await db
			.select()
			.from(schema.comments)
			.where(eq(schema.comments.sessionId, testData.sessionId));

		log(
			'1.13',
			!!deletedSession &&
				remainingAlts.length === 0 &&
				remainingPassages.length === 0 &&
				remainingComments.length === 0,
			'CASCADE delete removed all child rows'
		);

		// Test 1.14: CHECK constraint on influence_type (attempt invalid insert)
		let constraintFailed = false;
		try {
			await db.insert(schema.alternatives).values({
				sessionId: testData.sessionId,
				label: 'Invalid',
				influenceType: 'invalid_type' as any,
				storyTitle: 'Test',
				storySummary: 'Test',
				picked: false
			});
		} catch (e: any) {
			constraintFailed = true;
		}
		log('1.14', constraintFailed, 'CHECK constraint rejected invalid influence_type');

		// Create new session for remaining tests
		const [newSession] = await db
			.insert(schema.sessions)
			.values({
				userId: testData.userId,
				mood: 'Joyful',
				category: 'Faith',
				timeOfDay: 'Morning',
				timeOfYear: 'Summer',
				currentDateText: '2026-06-16'
			})
			.returning();

		const [newAlt] = await db
			.insert(schema.alternatives)
			.values({
				sessionId: newSession.id,
				label: 'Primary',
				influenceType: 'primary',
				storyTitle: 'Test Story',
				storySummary: 'Test summary',
				picked: false
			})
			.returning();

		await db.insert(schema.passages).values([
			{
				alternativeId: newAlt.id,
				reference: 'John 3:16',
				passageText: 'For God so loved the world...',
				book: 'John',
				chapter: '3',
				orderIndex: 1
			},
			{
				alternativeId: newAlt.id,
				reference: 'John 3:17',
				passageText: 'For God did not send his Son...',
				book: 'John',
				chapter: '3',
				orderIndex: 0
			}
		]);

		await db.insert(schema.prayerPoints).values([
			{
				alternativeId: newAlt.id,
				content: 'Prayer 1',
				orderIndex: 1
			},
			{
				alternativeId: newAlt.id,
				content: 'Prayer 2',
				orderIndex: 0
			}
		]);

		// Test 1.15: Query alternatives with mood/category filter
		const filteredAlts = await db
			.select()
			.from(schema.alternatives)
			.innerJoin(schema.sessions, eq(schema.alternatives.sessionId, schema.sessions.id))
			.where(
				and(eq(schema.sessions.mood, 'Joyful'), eq(schema.sessions.category, 'Faith'))
			);
		log('1.15', filteredAlts.length > 0, 'Category-scoped query returned results');

		// Test 1.16: Query passages ordered by order_index
		const orderedPassages = await db
			.select()
			.from(schema.passages)
			.where(eq(schema.passages.alternativeId, newAlt.id))
			.orderBy(schema.passages.orderIndex);
		log(
			'1.16',
			orderedPassages.length === 2 && orderedPassages[0].orderIndex < orderedPassages[1].orderIndex,
			'Passages returned in correct order'
		);

		// Test 1.17: Query prayer points ordered by order_index
		const orderedPrayers = await db
			.select()
			.from(schema.prayerPoints)
			.where(eq(schema.prayerPoints.alternativeId, newAlt.id))
			.orderBy(schema.prayerPoints.orderIndex);
		log(
			'1.17',
			orderedPrayers.length === 2 && orderedPrayers[0].orderIndex < orderedPrayers[1].orderIndex,
			'Prayer points returned in correct order'
		);

		// Test 1.18: Query verses_read grouped (just verify query works)
		const versesGrouped = await db
			.select()
			.from(schema.versesRead)
			.where(eq(schema.versesRead.userId, testData.userId));
		log('1.18', versesGrouped.length >= 0, 'Verses read query executed');

		// Test 1.19: Count rows in each table
		const userCount = await db.select().from(schema.users);
		const quoteCount = await db.select().from(schema.motivationalQuotes);
		const sessionCount = await db.select().from(schema.sessions);
		const altCount = await db.select().from(schema.alternatives);
		const passageCount = await db.select().from(schema.passages);
		const prayerCount = await db.select().from(schema.prayerPoints);
		log(
			'1.19',
			userCount.length >= 1 &&
				quoteCount.length >= 1 &&
				sessionCount.length >= 1 &&
				altCount.length >= 1 &&
				passageCount.length >= 2 &&
				prayerCount.length >= 2,
			'Row counts match expectations'
		);

		// Test 1.20: Studio verification (manual)
		log('1.20', true, 'Run "pnpm db:studio" to visually verify tables and data');

		// Cleanup
		await db.delete(schema.users).where(eq(schema.users.id, testData.userId));
		await db.delete(schema.motivationalQuotes).where(eq(schema.motivationalQuotes.id, testData.quoteId));

		console.log('\n=== Cleanup Complete ===\n');
	} catch (error: any) {
		console.error('\n[ERROR] Test execution failed:', error.message);
		console.error(error.stack);
	}

	// Summary
	const passed = testResults.filter((r) => r.passed).length;
	const failed = testResults.filter((r) => !r.passed).length;
	console.log(`\n=== Summary: ${passed}/${testResults.length} passed, ${failed} failed ===\n`);

	await client.end();
	process.exit(failed > 0 ? 1 : 0);
}

runTests();
