import { config } from 'dotenv';
import { fetchPassage, fetchMultiplePassages } from '../bible.js';

config();

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	console.log('\n=== Stage 3: Bible API Verification ===\n');

	try {
		// Test 3.1: Fetch John 3:16 (KJV)
		const john316 = await fetchPassage('John 3:16', 'KJV');
		log(
			'3.1',
			john316.passageText.toLowerCase().includes('god so loved') &&
				john316.book === 'JHN' &&
				john316.chapter === '3',
			`John 3:16 fetched: "${john316.passageText.slice(0, 50)}..."`
		);

		// Test 3.2: Fetch Romans 8:28-30 (KJV)
		const rom8 = await fetchPassage('Romans 8:28-30', 'KJV');
		log(
			'3.2',
			rom8.passageText.length > 100 && rom8.book === 'ROM' && rom8.chapter === '8',
			`Romans 8:28-30 fetched (${rom8.passageText.length} chars)`
		);

		// Test 3.3: Fetch 1 Samuel 17 (full chapter)
		const sam17 = await fetchPassage('1 Samuel 17', 'KJV');
		log(
			'3.3',
			sam17.passageText.length > 1000 && sam17.book === '1SA' && sam17.chapter === '17',
			`1 Samuel 17 fetched (${sam17.passageText.length} chars)`
		);

		// Test 3.4: Fetch Genesis 1:1-31 (full chapter range)
		const gen1 = await fetchPassage('Genesis 1:1-31', 'KJV');
		log(
			'3.4',
			gen1.passageText.length > 500 && gen1.book === 'GEN' && gen1.chapter === '1',
			`Genesis 1:1-31 fetched (${gen1.passageText.length} chars)`
		);

		// Test 3.5: Fetch invalid reference
		let invalidError = false;
		try {
			await fetchPassage('FakeBook 1:1', 'KJV');
		} catch {
			invalidError = true;
		}
		log('3.5', invalidError, 'Invalid reference throws error (not crash)');

		// Test 3.6: Fetch with invalid API key (simulate by checking error handling)
		let apiKeyError = false;
		try {
			const originalKey = process.env.API_BIBLE_KEY;
			process.env.API_BIBLE_KEY = 'invalid_key';
			await fetchPassage('John 3:16', 'KJV');
			process.env.API_BIBLE_KEY = originalKey;
		} catch {
			apiKeyError = true;
		}
		log('3.6', apiKeyError, 'Invalid API key throws error (not crash)');

		// Test 3.7: Fetch 10 passages in sequence
		const refs = [
			'John 3:16',
			'Romans 8:28',
			'Psalm 23:1',
			'Proverbs 3:5',
			'Isaiah 40:31',
			'Matthew 5:14',
			'Philippians 4:13',
			'Hebrews 11:1',
			'James 1:5',
			'1 Peter 5:7'
		];
		const passages = await fetchMultiplePassages(refs, 'KJV');
		log('3.7', passages.length === 10, `10 passages fetched in sequence (${passages.length} succeeded)`);

		// Test 3.8: Verify response shape
		const shapeTest = await fetchPassage('John 1:1', 'KJV');
		const hasAllFields =
			typeof shapeTest.reference === 'string' &&
			typeof shapeTest.passageText === 'string' &&
			typeof shapeTest.book === 'string' &&
			typeof shapeTest.chapter === 'string' &&
			shapeTest.passageText.length > 0;
		log('3.8', hasAllFields, 'Response has all required fields (reference, passageText, book, chapter)');
	} catch (error: any) {
		console.error('\n[ERROR] Test execution failed:', error.message);
	}

	// Summary
	const passed = testResults.filter((r) => r.passed).length;
	const failed = testResults.filter((r) => !r.passed).length;
	console.log(`\n=== Summary: ${passed}/${testResults.length} passed, ${failed} failed ===\n`);

	process.exit(failed > 0 ? 1 : 0);
}

runTests();
