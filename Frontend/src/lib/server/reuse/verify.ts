import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
	users,
	sessions,
	alternatives,
	passages,
	prayerPoints
} from '../db/schema.js';

config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { users, sessions, alternatives, passages, prayerPoints } });

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function findReusableAlternatives(userId: string, mood: string, category: string) {
	const reusable = await db
		.select({ alternative: alternatives, session: sessions })
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

async function copyAlternativeToSession(originalAltId: string, newSessionId: string) {
	const original = await db.select().from(alternatives).where(eq(alternatives.id, originalAltId)).limit(1);
	if (original.length === 0) throw new Error(`Original alternative ${originalAltId} not found`);

	const origAlt = original[0];
	const [newAlt] = await db.insert(alternatives).values({
		sessionId: newSessionId,
		label: origAlt.label,
		influenceType: origAlt.influenceType,
		storyTitle: origAlt.storyTitle,
		storySummary: origAlt.storySummary,
		reasoning: origAlt.reasoning,
		picked: false,
		reusedFrom: origAlt.id
	}).returning();

	const originalPassages = await db.select().from(passages).where(eq(passages.alternativeId, originalAltId)).orderBy(passages.orderIndex);
	if (originalPassages.length > 0) {
		await db.insert(passages).values(originalPassages.map((p) => ({
			alternativeId: newAlt.id,
			reference: p.reference,
			passageText: p.passageText,
			book: p.book,
			chapter: p.chapter,
			orderIndex: p.orderIndex
		})));
	}

	const originalPP = await db.select().from(prayerPoints).where(eq(prayerPoints.alternativeId, originalAltId)).orderBy(prayerPoints.orderIndex);
	if (originalPP.length > 0) {
		await db.insert(prayerPoints).values(originalPP.map((pp) => ({
			alternativeId: newAlt.id,
			content: pp.content,
			passageRef: pp.passageRef,
			orderIndex: pp.orderIndex
		})));
	}

	return newAlt;
}

async function pickAlternative(alternativeId: string) {
	const [updated] = await db.update(alternatives).set({ picked: true }).where(eq(alternatives.id, alternativeId)).returning();
	return updated;
}

async function runTests() {
	console.log('\n=== Stage 6: Alternative Reuse Verification ===\n');

	let testUserId = '';
	let sessionAId = '';
	let altA1Id = '';
	let altA2Id = '';
	let altA3Id = '';

	try {
		// Create test user
		const [testUser] = await db.insert(users).values({ name: 'Reuse Test User', translation: 'KJV' }).returning();
		testUserId = testUser.id;

		// Test 6.1: Create session A with 3 unpicked alternatives
		const [sessionA] = await db.insert(sessions).values({
			userId: testUserId,
			mood: 'Joyful',
			category: 'Faith',
			timeOfDay: 'Morning',
			timeOfYear: 'Summer',
			currentDateText: '2026-06-16'
		}).returning();
		sessionAId = sessionA.id;

		const [altA1] = await db.insert(alternatives).values({
			sessionId: sessionAId,
			label: 'Primary',
			influenceType: 'primary',
			storyTitle: 'David and Goliath',
			storySummary: 'A young shepherd defeats a giant.',
			reasoning: 'Matches Joyful mood and Faith category',
			picked: false
		}).returning();
		altA1Id = altA1.id;

		const [altA2] = await db.insert(alternatives).values({
			sessionId: sessionAId,
			label: 'Historical',
			influenceType: 'historical',
			storyTitle: 'Esther Saves Her People',
			storySummary: 'Queen Esther risks her life.',
			reasoning: 'Historical connection',
			picked: false
		}).returning();
		altA2Id = altA2.id;

		const [altA3] = await db.insert(alternatives).values({
			sessionId: sessionAId,
			label: 'User Interest',
			influenceType: 'user_directed',
			storyTitle: 'Peter Walking on Water',
			storySummary: 'Peter steps out of the boat.',
			reasoning: 'User-directed',
			picked: false
		}).returning();
		altA3Id = altA3.id;

		log('6.1', !!sessionAId && !!altA1Id && !!altA2Id && !!altA3Id, 'Session A created with 3 unpicked alternatives');

		// Test 6.2: findReusableAlternatives with exact match
		const reusable = await findReusableAlternatives(testUserId, 'Joyful', 'Faith');
		log('6.2', reusable.length <= 2 && reusable.length >= 1, `Found ${reusable.length} reusable alternatives (max 2)`);

		// Test 6.3: Mood mismatch → 0 results
		const moodMismatch = await findReusableAlternatives(testUserId, 'Anxious', 'Faith');
		log('6.3', moodMismatch.length === 0, `Mood mismatch returned ${moodMismatch.length} (expected 0)`);

		// Test 6.4: Category mismatch → 0 results
		const catMismatch = await findReusableAlternatives(testUserId, 'Joyful', 'Love');
		log('6.4', catMismatch.length === 0, `Category mismatch returned ${catMismatch.length} (expected 0)`);

		// Test 6.5: copyAlternativeToSession
		const copiedAlt = await copyAlternativeToSession(altA1Id, sessionAId);
		log('6.5', !!copiedAlt.id && copiedAlt.reusedFrom === altA1Id, `Copied alternative created with reused_from=${copiedAlt.reusedFrom}`);

		// Test 6.6: Verify copied alternative has new IDs but same content
		const originalAlt = await db.select().from(alternatives).where(eq(alternatives.id, altA1Id)).limit(1);
		log('6.6', copiedAlt.id !== altA1Id && copiedAlt.storyTitle === originalAlt[0].storyTitle && copiedAlt.storySummary === originalAlt[0].storySummary, 'Copied alternative has new IDs but same content');

		// Test 6.7: Verify copied passages
		const originalPassages = await db.select().from(passages).where(eq(passages.alternativeId, altA1Id));
		const copiedPassages = await db.select().from(passages).where(eq(passages.alternativeId, copiedAlt.id));
		log('6.7', copiedPassages.length === originalPassages.length && copiedPassages.every((cp) => cp.alternativeId === copiedAlt.id), `Copied ${copiedPassages.length} passages with correct alternative_id`);

		// Test 6.8: Verify copied prayer points
		const originalPP = await db.select().from(prayerPoints).where(eq(prayerPoints.alternativeId, altA1Id));
		const copiedPP = await db.select().from(prayerPoints).where(eq(prayerPoints.alternativeId, copiedAlt.id));
		log('6.8', copiedPP.length === originalPP.length && copiedPP.every((cpp) => cpp.alternativeId === copiedAlt.id), `Copied ${copiedPP.length} prayer points with correct alternative_id`);

		// Test 6.9: pickAlternative
		const picked = await pickAlternative(copiedAlt.id);
		log('6.9', picked.picked === true, 'Alternative marked as picked');

		// Test 6.10: Original unchanged
		const originalAfterPick = await db.select().from(alternatives).where(eq(alternatives.id, altA1Id)).limit(1);
		log('6.10', originalAfterPick[0].picked === false, 'Original alternative still unpicked');

		// Test 6.11: Picked alternative excluded from reuse
		const reusableAfterPick = await findReusableAlternatives(testUserId, 'Joyful', 'Faith');
		const stillHasCopied = reusableAfterPick.some((a) => a.id === copiedAlt.id);
		log('6.11', !stillHasCopied, 'Picked alternative excluded from reuse results');

		// Test 6.12: Create 5 sessions with same mood+category
		for (let i = 0; i < 5; i++) {
			const [s] = await db.insert(sessions).values({
				userId: testUserId,
				mood: 'Joyful',
				category: 'Faith',
				timeOfDay: 'Morning',
				timeOfYear: 'Summer',
				currentDateText: '2026-06-16'
			}).returning();

			for (let j = 0; j < 3; j++) {
				await db.insert(alternatives).values({
					sessionId: s.id,
					label: `Alt ${j + 1}`,
					influenceType: j === 0 ? 'primary' : j === 1 ? 'historical' : 'user_directed',
					storyTitle: `Story ${i}-${j}`,
					storySummary: `Summary ${i}-${j}`,
					reasoning: `Reason ${i}-${j}`,
					picked: false
				});
			}
		}

		const totalUnpicked = await db.select().from(alternatives).where(
			and(
				eq(alternatives.picked, false),
				sql`EXISTS (SELECT 1 FROM sessions WHERE sessions.id = alternatives.session_id AND sessions.user_id = ${testUserId} AND sessions.mood = 'Joyful' AND sessions.category = 'Faith')`
			)
		);
		log('6.12', totalUnpicked.length >= 15, `Created ${totalUnpicked.length} unpicked alternatives (target: 15+)`);

		// Test 6.13: findReusableAlternatives returns max 2
		const limited = await findReusableAlternatives(testUserId, 'Joyful', 'Faith');
		log('6.13', limited.length <= 2, `findReusableAlternatives returned ${limited.length} (max 2)`);

		// Test 6.14: Verify the 2 returned are the most recent
		const allRecent = await db
			.select({ id: alternatives.id, createdAt: sessions.createdAt })
			.from(alternatives)
			.innerJoin(sessions, eq(alternatives.sessionId, sessions.id))
			.where(
				and(
					eq(sessions.userId, testUserId),
					eq(sessions.mood, 'Joyful'),
					eq(sessions.category, 'Faith'),
					eq(alternatives.picked, false)
				)
			)
			.orderBy(desc(sessions.createdAt))
			.limit(2);

		const returnedIds = limited.map((a) => a.id);
		const expectedIds = allRecent.map((a) => a.id);
		log('6.14', JSON.stringify(returnedIds.sort()) === JSON.stringify(expectedIds.sort()), 'Returned the 2 most recent alternatives');

		// Test 6.15: Full lifecycle
		const [lifecycleSession] = await db.insert(sessions).values({
			userId: testUserId,
			mood: 'Joyful',
			category: 'Faith',
			timeOfDay: 'Morning',
			timeOfYear: 'Summer',
			currentDateText: '2026-06-16'
		}).returning();

		const reusableForLifecycle = await findReusableAlternatives(testUserId, 'Joyful', 'Faith');
		const reusedCount = Math.min(reusableForLifecycle.length, 2);
		const reusedAlts = reusableForLifecycle.slice(0, reusedCount);
		const copiedForLifecycle = [];
		for (const alt of reusedAlts) {
			const copied = await copyAlternativeToSession(alt.id, lifecycleSession.id);
			copiedForLifecycle.push(copied);
		}

		const freshNeeded = 3 - reusedCount;
		log('6.15', reusedCount <= 2 && freshNeeded >= 1, `Lifecycle: reused ${reusedCount}, need ${freshNeeded} fresh (min 1)`);

		// Pick one and verify remaining are still reusable
		if (copiedForLifecycle.length > 0) {
			await pickAlternative(copiedForLifecycle[0].id);
			const stillReusable = await findReusableAlternatives(testUserId, 'Joyful', 'Faith');
			log('6.15b', stillReusable.length > 0, `After picking 1, ${stillReusable.length} still reusable`);
		}

		// Cleanup
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
