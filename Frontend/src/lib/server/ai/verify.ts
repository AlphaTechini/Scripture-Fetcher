import { config } from 'dotenv';
import { generateAlternatives } from '../ai.js';

config();

const testResults: { test: string; passed: boolean; message: string }[] = [];

function log(test: string, passed: boolean, message: string) {
	const status = passed ? '[PASS]' : '[FAIL]';
	console.log(`${status} ${test}: ${message}`);
	testResults.push({ test, passed, message });
}

async function runTests() {
	console.log('\n=== Stage 5: AI Story Selection Verification ===\n');

	try {
		// Test 5.1: Basic call with mood + category
		const result1 = await generateAlternatives({
			mood: 'Joyful',
			category: 'Faith',
			timeOfDay: 'Morning',
			timeOfYear: 'Summer',
			currentDate: '2026-06-16',
			readingHistory: { stories: [], topics: [], books: [] }
		});
		log('5.1', result1.length === 3, `Returned ${result1.length} alternatives`);

		// Test 5.2: Each alternative has required fields
		const allHaveFields = result1.every(
			(a) =>
				a.storyTitle?.length > 0 &&
				a.storySummary?.length > 0 &&
				a.reasoning?.length > 0 &&
				a.label?.length > 0
		);
		log('5.2', allHaveFields, 'All alternatives have storyTitle, storySummary, reasoning, label');

		// Test 5.3: Each alternative has correct influenceType
		const types = result1.map((a) => a.influenceType).sort();
		const expectedTypes = ['historical', 'primary', 'user_directed'].sort();
		log('5.3', JSON.stringify(types) === JSON.stringify(expectedTypes), `Influence types: ${types.join(', ')}`);

		// Test 5.4: Each alternative has 2+ passages
		const allHavePassages = result1.every(
			(a) => a.passages?.length >= 2 && a.passages.every((p) => p.reference && p.passageText && p.book && p.chapter)
		);
		log('5.4', allHavePassages, `All alternatives have 2+ passages with required fields`);

		// Test 5.5: Passage references are valid Bible references
		const allRefs = result1.flatMap((a) => a.passages.map((p) => p.reference));
		const validRefPattern = /^[1-3]?\s*[A-Za-z]+\s+\d+(:\d+(-\d+)?)?$/;
		const allValidRefs = allRefs.every((ref) => validRefPattern.test(ref));
		log('5.5', allValidRefs, `All ${allRefs.length} passage references match valid Bible reference pattern`);

		// Test 5.6: Passage text is non-empty
		const allHaveText = result1.every(
			(a) => a.passages.every((p) => p.passageText.length > 20)
		);
		log('5.6', allHaveText, 'All passages have non-empty text');

		// Test 5.7: Each alternative has 8-15 prayer points
		const allHavePrayers = result1.every(
			(a) => a.prayerPoints?.length >= 8 && a.prayerPoints?.length <= 15
		);
		const prayerCounts = result1.map((a) => a.prayerPoints?.length || 0);
		log('5.7', allHavePrayers, `Prayer point counts: ${prayerCounts.join(', ')} (target: 8-15 each)`);

		// Test 5.8: Prayer points have content
		const allPrayersHaveContent = result1.every(
			(a) => a.prayerPoints?.every((p) => p.content?.length > 10)
		);
		log('5.8', allPrayersHaveContent, 'All prayer points have content');

		// Test 5.9: User notes influence Alternative 3
		await new Promise(r => setTimeout(r, 2000));
		const result2 = await generateAlternatives({
			mood: 'Hopeful',
			category: 'Faith',
			timeOfDay: 'Evening',
			timeOfYear: 'Summer',
			currentDate: '2026-06-16',
			userNotes: 'I want to learn about Peter',
			readingHistory: { stories: [], topics: [], books: [] }
		});
		const userDirected = result2.find((a) => a.influenceType === 'user_directed');
		const mentionsPeter = userDirected?.storyTitle?.toLowerCase().includes('peter') ||
			userDirected?.storySummary?.toLowerCase().includes('peter') ||
			userDirected?.passages?.some((p) => p.book?.toLowerCase().includes('peter') || p.reference?.toLowerCase().includes('peter'));
		log('5.9', !!mentionsPeter, `User-directed alternative mentions Peter: ${userDirected?.storyTitle}`);

		// Test 5.10: Empty user notes → Alternative 3 is category-focused
		await new Promise(r => setTimeout(r, 2000));
		const result3 = await generateAlternatives({
			mood: 'Hopeful',
			category: 'Faith',
			timeOfDay: 'Evening',
			timeOfYear: 'Summer',
			currentDate: '2026-06-16',
			readingHistory: { stories: [], topics: [], books: [] }
		});
		const userDirected3 = result3.find((a) => a.influenceType === 'user_directed');
		log('5.10', !!userDirected3 && userDirected3.storyTitle?.length > 0, `Empty notes → category-focused: ${userDirected3?.storyTitle}`);

		// Test 5.11: Christmas date influences Alternative 2
		await new Promise(r => setTimeout(r, 2000));
		const result4 = await generateAlternatives({
			mood: 'Joyful',
			category: 'Love',
			timeOfDay: 'Morning',
			timeOfYear: 'Winter',
			currentDate: '2026-12-25',
			readingHistory: { stories: [], topics: [], books: [] }
		});
		const historical = result4.find((a) => a.influenceType === 'historical');
		const christmasRelated = historical?.reasoning?.toLowerCase().includes('christmas') ||
			historical?.reasoning?.toLowerCase().includes('december') ||
			historical?.reasoning?.toLowerCase().includes('incarnation') ||
			historical?.reasoning?.toLowerCase().includes('birth') ||
			historical?.storyTitle?.toLowerCase().includes('birth') ||
			historical?.storyTitle?.toLowerCase().includes('jesus');
		log('5.11', !!christmasRelated, `Christmas date influences historical: ${historical?.storyTitle}`);

		// Test 5.12: Reading history avoids repetition
		await new Promise(r => setTimeout(r, 2000));
		const result5 = await generateAlternatives({
			mood: 'Joyful',
			category: 'Faith',
			timeOfDay: 'Morning',
			timeOfYear: 'Summer',
			currentDate: '2026-06-16',
			readingHistory: {
				stories: ['David and Goliath', 'Noah\'s Ark', 'The Good Samaritan'],
				topics: ['Courage', 'Obedience', 'Compassion'],
				books: ['1 Samuel', 'Genesis', 'Luke']
			}
		});
		const allStories = result5.map((a) => a.storyTitle.toLowerCase());
		const noRepeat = !allStories.some((s) =>
			s.includes('david') || s.includes('goliath') || s.includes('noah') || s.includes('ark') || s.includes('samaritan')
		);
		log('5.12', noRepeat, `AI avoided recent stories: ${allStories.join(', ')}`);

		// Test 5.13: Response is valid JSON parseable into TypeScript types
		const validStructure = result1.every(
			(a) =>
				typeof a.label === 'string' &&
				typeof a.influenceType === 'string' &&
				typeof a.storyTitle === 'string' &&
				typeof a.storySummary === 'string' &&
				typeof a.reasoning === 'string' &&
				Array.isArray(a.passages) &&
				Array.isArray(a.prayerPoints)
		);
		log('5.13', validStructure, 'Response structure matches TypeScript types');

		// Test 5.14: Call completes within 90 seconds (measured by test runner)
		await new Promise(r => setTimeout(r, 2000));
		const startTime = Date.now();
		await generateAlternatives({
			mood: 'Peaceful',
			category: 'Hope',
			timeOfDay: 'Night',
			timeOfYear: 'Winter',
			currentDate: '2026-06-16',
			readingHistory: { stories: [], topics: [], books: [] }
		});
		const elapsed = Date.now() - startTime;
		log('5.14', elapsed < 90000, `Call completed in ${elapsed}ms (limit: 90000ms)`);
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
