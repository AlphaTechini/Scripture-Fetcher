import { parseReference, buildSearchQuery } from '../bible.js';

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	console.log('\n=== Stage 3: Bible Reference Parser Verification ===\n');

	try {
		// Test 3.1: Parse single verse
		const john316 = parseReference('John 3:16');
		log(
			'3.1',
			john316?.book === 'JHN' && john316?.chapter === '3' && john316?.verses === '16',
			`John 3:16 parsed: book=${john316?.book}, chapter=${john316?.chapter}, verses=${john316?.verses}`
		);

		// Test 3.2: Parse verse range
		const rom8 = parseReference('Romans 8:28-30');
		log(
			'3.2',
			rom8?.book === 'ROM' && rom8?.chapter === '8' && rom8?.verses === '28-30',
			`Romans 8:28-30 parsed: book=${rom8?.book}, chapter=${rom8?.chapter}, verses=${rom8?.verses}`
		);

		// Test 3.3: Parse full chapter (no verses)
		const sam17 = parseReference('1 Samuel 17');
		log(
			'3.3',
			sam17?.book === '1SA' && sam17?.chapter === '17' && sam17?.verses === undefined,
			`1 Samuel 17 parsed: book=${sam17?.book}, chapter=${sam17?.chapter}`
		);

		// Test 3.4: Parse chapter range
		const gen1 = parseReference('Genesis 1:1-31');
		log(
			'3.4',
			gen1?.book === 'GEN' && gen1?.chapter === '1' && gen1?.verses === '1-31',
			`Genesis 1:1-31 parsed: book=${gen1?.book}, chapter=${gen1?.chapter}, verses=${gen1?.verses}`
		);

		// Test 3.5: Parse invalid reference
		const invalid = parseReference('FakeBook 1:1');
		log('3.5', invalid === null, `Invalid reference returns null: "${invalid}"`);

		// Test 3.6: Parse abbreviated book name
		const jn = parseReference('Jn 3:16');
		log(
			'3.6',
			jn?.book === 'JHN' && jn?.chapter === '3',
			`Jn 3:16 parsed (abbreviated): book=${jn?.book}`
		);

		// Test 3.7: Build search query
		const query = buildSearchQuery('John 3:16');
		log(
			'3.7',
			query.includes('John 3:16') && query.includes('KJV'),
			`Search query: "${query}"`
		);

		// Test 3.8: Parse various book formats
		const tests = [
			{ ref: 'Matt 5:14', expected: 'MAT' },
			{ ref: '1 Cor 13:4', expected: '1CO' },
			{ ref: '2 Peter 1:3', expected: '2PE' },
			{ ref: 'Rev 21:1', expected: 'REV' },
			{ ref: 'Psalm 23:1', expected: 'PSA' }
		];
		const allParsed = tests.every(t => {
			const result = parseReference(t.ref);
			return result?.book === t.expected;
		});
		log('3.8', allParsed, `All abbreviated book names parsed correctly`);
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
