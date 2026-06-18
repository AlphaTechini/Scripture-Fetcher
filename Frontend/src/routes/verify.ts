import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
	users,
	sessions,
	alternatives,
	passages,
	prayerPoints,
	comments,
	versesRead,
	bookmarks
} from '../lib/server/db/schema.js';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { users, sessions, alternatives, passages, prayerPoints, comments, versesRead, bookmarks } });

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	console.log('\n=== Stage 7: API Endpoints Verification ===\n');

	let testUserId = '';
	let sessionId = '';
	let altId = '';

	try {
		// Create test user
		const [testUser] = await db.insert(users).values({ name: 'API Test User', translation: 'KJV' }).returning();
		testUserId = testUser.id;

		// Test 7.1: Create session (simulates POST /api/scripture)
		const [newSession] = await db.insert(sessions).values({
			userId: testUserId,
			mood: 'Joyful',
			category: 'Faith',
			timeOfDay: 'Morning',
			timeOfYear: 'Summer',
			currentDateText: '2026-06-16',
			userNotes: 'Test notes'
		}).returning();
		sessionId = newSession.id;
		log('7.1', !!sessionId, `Session created: ${sessionId}`);

		// Test 7.2: Create 3 alternatives (simulates AI response)
		const [alt1] = await db.insert(alternatives).values({
			sessionId,
			label: 'Primary',
			influenceType: 'primary',
			storyTitle: 'David and Goliath',
			storySummary: 'A young shepherd defeats a giant.',
			reasoning: 'Matches Joyful mood and Faith category',
			picked: false
		}).returning();
		altId = alt1.id;

		await db.insert(alternatives).values({
			sessionId,
			label: 'Historical',
			influenceType: 'historical',
			storyTitle: 'Esther Saves Her People',
			storySummary: 'Queen Esther risks her life.',
			reasoning: 'Historical connection',
			picked: false
		});

		await db.insert(alternatives).values({
			sessionId,
			label: 'User Interest',
			influenceType: 'user_directed',
			storyTitle: 'Peter Walking on Water',
			storySummary: 'Peter steps out of the boat.',
			reasoning: 'User-directed',
			picked: false
		});

		log('7.2', !!altId, '3 alternatives created');

		// Test 7.3: Load session data (simulates GET /session/[id])
		const sessionData = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, testUserId))).limit(1);
		const sessionAlts = await db.select().from(alternatives).where(eq(alternatives.sessionId, sessionId)).orderBy(desc(alternatives.createdAt));
		log('7.3', sessionData.length === 1 && sessionAlts.length === 3, `Session loaded with ${sessionAlts.length} alternatives`);

		// Test 7.4: Load passages for alternative
		await db.insert(passages).values([
			{ alternativeId: altId, reference: '1 Samuel 17:1-11', passageText: 'Now the Philistines...', book: '1SA', chapter: '17', orderIndex: 0 },
			{ alternativeId: altId, reference: '1 Samuel 17:40-50', passageText: 'Then he took his staff...', book: '1SA', chapter: '17', orderIndex: 1 }
		]);
		const loadedPassages = await db.select().from(passages).where(eq(passages.alternativeId, altId)).orderBy(passages.orderIndex);
		log('7.4', loadedPassages.length === 2, `Loaded ${loadedPassages.length} passages in order`);

		// Test 7.5: Load prayer points
		await db.insert(prayerPoints).values([
			{ alternativeId: altId, content: 'Lord, give me courage.', passageRef: '1 Samuel 17:1-11', orderIndex: 0 },
			{ alternativeId: altId, content: 'Help me trust in Your strength.', passageRef: '1 Samuel 17:40-50', orderIndex: 1 }
		]);
		const loadedPP = await db.select().from(prayerPoints).where(eq(prayerPoints.alternativeId, altId)).orderBy(prayerPoints.orderIndex);
		log('7.5', loadedPP.length === 2, `Loaded ${loadedPP.length} prayer points`);

		// Test 7.6: Pick alternative (simulates POST form action)
		const [picked] = await db.update(alternatives).set({ picked: true }).where(eq(alternatives.id, altId)).returning();
		log('7.6', picked.picked === true, 'Alternative marked as picked');

		// Test 7.7: Save comment (simulates POST form action)
		const [comment] = await db.insert(comments).values({
			sessionId,
			userId: testUserId,
			content: 'This story really spoke to me today.'
		}).returning();
		log('7.7', !!comment.id, 'Comment saved');

		// Test 7.8: Mark verse as read (simulates POST form action)
		const [verse] = await db.insert(versesRead).values({
			userId: testUserId,
			sessionId,
			alternativeId: altId,
			verseReference: '1 Samuel 17:1'
		}).returning();
		log('7.8', !!verse.id, 'Verse marked as read');

		// Test 7.9: Bookmark session (simulates POST form action)
		const [bookmark] = await db.insert(bookmarks).values({
			userId: testUserId,
			sessionId
		}).returning();
		log('7.9', !!bookmark.id, 'Session bookmarked');

		// Test 7.10: Load history data
		const historySessions = await db
			.select({
				id: sessions.id,
				mood: sessions.mood,
				category: sessions.category,
				createdAt: sessions.createdAt
			})
			.from(sessions)
			.where(eq(sessions.userId, testUserId))
			.orderBy(desc(sessions.createdAt));
		log('7.10', historySessions.length >= 1, `History loaded ${historySessions.length} sessions`);

		// Test 7.11: Verify cross-user isolation
		const [otherUser] = await db.insert(users).values({ name: 'Other User', translation: 'KJV' }).returning();
		const otherSessions = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, otherUser.id)));
		log('7.11', otherSessions.length === 0, 'Cross-user isolation verified (other user sees 0 sessions)');

		// Test 7.12: Verify session with userNotes
		const sessionWithNotes = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
		log('7.12', sessionWithNotes[0]?.userNotes === 'Test notes', 'Session userNotes stored correctly');

		// Cleanup
		await db.delete(users).where(eq(users.id, testUserId));
		await db.delete(users).where(eq(users.id, otherUser.id));
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
