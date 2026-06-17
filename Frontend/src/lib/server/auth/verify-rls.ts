import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

config();

const supabaseAdmin = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SECRET_KEY!
);

const sql = postgres(process.env.DATABASE_URL!);

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	const testUserA = {
		email: `testusera_${Date.now()}@example.com`,
		password: 'TestPassword123!'
	};
	const testUserB = {
		email: `testuserb_${Date.now()}@example.com`,
		password: 'TestPassword123!'
	};

	let userASession: any = null;
	let userBSession: any = null;
	let userAId: string = '';
	let userBId: string = '';
	let sessionAId: string = '';
	let sessionBId: string = '';

	try {
		console.log('\n=== Stage 2: Auth + RLS Verification ===\n');

		// Test 2.1: Sign up User A (via admin to bypass rate limits)
		const { data: signUpA, error: signUpAError } = await supabaseAdmin.auth.admin.createUser({
			email: testUserA.email,
			password: testUserA.password,
			email_confirm: true
		});
		userAId = signUpA.user?.id || '';
		if (signUpAError) console.log('Signup A error:', signUpAError.message);
		log('2.1', !!userAId && !signUpAError, `User A created: ${userAId}`);

		// Test 2.2: Sign in User A
		const { data: signInA, error: signInAError } = await supabaseAdmin.auth.signInWithPassword({
			email: testUserA.email,
			password: testUserA.password
		});
		userASession = signInA.session;
		log('2.2', !!userASession && !signInAError, 'User A signed in successfully');

		// Test 2.3: Sign up User B (via admin)
		const { data: signUpB, error: signUpBError } = await supabaseAdmin.auth.admin.createUser({
			email: testUserB.email,
			password: testUserB.password,
			email_confirm: true
		});
		userBId = signUpB.user?.id || '';
		log('2.3', !!userBId && !signUpBError, `User B created: ${userBId}`);

		// Test 2.4: Sign in User B
		const { data: signInB, error: signInBError } = await supabaseAdmin.auth.signInWithPassword({
			email: testUserB.email,
			password: testUserB.password
		});
		userBSession = signInB.session;
		log('2.4', !!userBSession && !signInBError, 'User B signed in successfully');

		// Test 2.5: Insert session as User A (via direct SQL to bypass RLS for setup)
		const [sessionAResult] = await sql`
			INSERT INTO sessions (user_id, mood, category, time_of_day, time_of_year, current_date_text)
			VALUES (${userAId}, 'Joyful', 'Faith', 'Morning', 'Summer', '2026-06-16')
			RETURNING id
		`;
		sessionAId = sessionAResult?.id || '';
		log('2.5', !!sessionAId, `User A created session: ${sessionAId}`);

		// Test 2.6: Insert session as User B
		const [sessionBResult] = await sql`
			INSERT INTO sessions (user_id, mood, category, time_of_day, time_of_year, current_date_text)
			VALUES (${userBId}, 'Anxious', 'Love', 'Evening', 'Winter', '2026-06-16')
			RETURNING id
		`;
		sessionBId = sessionBResult?.id || '';
		log('2.6', !!sessionBId, `User B created session: ${sessionBId}`);

		// Test 2.7: Query sessions as User A (should see only User A's sessions)
		const supabaseA = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
			global: { headers: { Authorization: `Bearer ${userASession.access_token}` } }
		});
		const { data: sessionsA, error: sessionsAError } = await supabaseA.from('sessions').select('*');
		log(
			'2.7',
			sessionsA?.length === 1 && sessionsA[0].user_id === userAId && !sessionsAError,
			`User A sees ${sessionsA?.length} session(s) (own only)`
		);

		// Test 2.8: Query sessions as User B (should see only User B's sessions)
		const supabaseB = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
			global: { headers: { Authorization: `Bearer ${userBSession.access_token}` } }
		});
		const { data: sessionsB, error: sessionsBError } = await supabaseB.from('sessions').select('*');
		log(
			'2.8',
			sessionsB?.length === 1 && sessionsB[0].user_id === userBId && !sessionsBError,
			`User B sees ${sessionsB?.length} session(s) (own only)`
		);

		// Test 2.9: User A creates alternative (via direct SQL for setup)
		const [altAResult] = await sql`
			INSERT INTO alternatives (session_id, label, influence_type, story_title, story_summary, reasoning, picked)
			VALUES (${sessionAId}, 'Primary', 'primary', 'David and Goliath', 'A young shepherd defeats a giant.', 'Matches Joyful mood and Faith category', false)
			RETURNING id
		`;
		const altAId = altAResult?.id || '';
		log('2.9', !!altAId, `User A created alternative: ${altAId}`);

		// Test 2.10: User B tries to query User A's alternatives (should see 0)
		const { data: altsB, error: altsBError } = await supabaseB.from('alternatives').select('*');
		log(
			'2.10',
			(altsB?.length === 0 || altsB?.every((a: any) => a.session_id === sessionBId)) && !altsBError,
			`User B sees ${altsB?.length} alternative(s) (none from User A)`
		);

		// Test 2.11: User A creates comment (via direct SQL for setup)
		const [commentAResult] = await sql`
			INSERT INTO comments (session_id, user_id, content)
			VALUES (${sessionAId}, ${userAId}, 'This story really spoke to me today.')
			RETURNING id
		`;
		log('2.11', !!commentAResult?.id, 'User A created comment');

		// Test 2.12: User B tries to create comment on User A's session (should fail via RLS)
		const { error: commentBError } = await supabaseB.from('comments').insert({
			session_id: sessionAId,
			user_id: userBId,
			content: 'This should fail due to RLS'
		});
		log(
			'2.12',
			!!commentBError,
			`User B blocked from commenting on User A's session: ${commentBError?.message || 'RLS blocked'}`
		);

		// Test 2.13: User A marks verse as read (via direct SQL for setup)
		const [verseAResult] = await sql`
			INSERT INTO verses_read (user_id, session_id, verse_reference)
			VALUES (${userAId}, ${sessionAId}, '1 Samuel 17:1')
			RETURNING id
		`;
		log('2.13', !!verseAResult?.id, 'User A marked verse as read');

		// Test 2.14: User B queries verses_read (should see only User B's, which is 0)
		const { data: versesB, error: versesBError } = await supabaseB.from('verses_read').select('*');
		log(
			'2.14',
			(versesB?.length === 0 || versesB?.every((v: any) => v.user_id === userBId)) && !versesBError,
			`User B sees ${versesB?.length} verse(s) read (none from User A)`
		);

		// Test 2.15: Sign out User A
		const { error: signOutError } = await supabaseA.auth.signOut();
		log('2.15', !signOutError, 'User A signed out');

		// Test 2.16: Verify signed out user cannot query sessions (create fresh client without token)
		const supabaseSignedOut = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
		const { data: signedOutData, error: signedOutError } = await supabaseSignedOut.from('sessions').select('*');
		log(
			'2.16',
			signedOutData?.length === 0 || !!signedOutError,
			`Signed out user sees ${signedOutData?.length || 0} sessions (blocked)`
		);

		// Cleanup: Delete test users and their data
		await sql`DELETE FROM quote_logs WHERE user_id IN (${userAId}, ${userBId})`;
		await sql`DELETE FROM bookmarks WHERE user_id IN (${userAId}, ${userBId})`;
		await sql`DELETE FROM verses_read WHERE user_id IN (${userAId}, ${userBId})`;
		await sql`DELETE FROM comments WHERE user_id IN (${userAId}, ${userBId})`;
		await sql`DELETE FROM prayer_points WHERE alternative_id IN (SELECT id FROM alternatives WHERE session_id IN (SELECT id FROM sessions WHERE user_id IN (${userAId}, ${userBId})))`;
		await sql`DELETE FROM passages WHERE alternative_id IN (SELECT id FROM alternatives WHERE session_id IN (SELECT id FROM sessions WHERE user_id IN (${userAId}, ${userBId})))`;
		await sql`DELETE FROM alternatives WHERE session_id IN (SELECT id FROM sessions WHERE user_id IN (${userAId}, ${userBId}))`;
		await sql`DELETE FROM sessions WHERE user_id IN (${userAId}, ${userBId})`;
		await supabaseAdmin.auth.admin.deleteUser(userAId);
		await supabaseAdmin.auth.admin.deleteUser(userBId);
		console.log('\n=== Cleanup Complete ===\n');
	} catch (error: any) {
		console.error('\n[ERROR] Test execution failed:', error.message);
		console.error(error.stack);
	}

	// Summary
	const passed = testResults.filter((r) => r.passed).length;
	const failed = testResults.filter((r) => !r.passed).length;
	console.log(`\n=== Summary: ${passed}/${testResults.length} passed, ${failed} failed ===\n`);

	await sql.end();
	process.exit(failed > 0 ? 1 : 0);
}

runTests();
