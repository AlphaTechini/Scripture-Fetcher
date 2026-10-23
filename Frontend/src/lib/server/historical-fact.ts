import {
	ANTHROPIC_MESSAGES_URL,
	ANTHROPIC_MODEL,
	ANTHROPIC_VERSION,
	getAnthropicApiKey,
	type AnthropicContentBlock,
	type AnthropicMessageResponse
} from './anthropic';

const MAX_SEARCHES = 3;
// The server pauses long search turns; a couple of resumes is plenty for 3 searches.
const MAX_PAUSE_RESUMES = 2;
const LOOKUP_TIMEOUT_MS = 45_000;

export interface HistoricalFact {
	fact: string;
	source: string;
}

function formatCalendarDay(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

function buildLookupPrompt(calendarDay: string): string {
	return `Today is ${calendarDay}. Use web search to find ONE well-documented event that happened on ${calendarDay} (any year) in church history, Christian history, or world history, and that connects naturally to a theme found in the Bible.

Only pick an event whose date you confirmed in the search results. Prefer widely known events over obscure ones.

Reply with exactly these two lines and nothing else:
FACT: <one sentence stating the event, including the year>
SOURCE: <name of the website you confirmed it on>

If no event could be confirmed, reply with exactly: NONE`;
}

// Search replies interleave narration ("I'll search for...") with result blocks, and
// citations split the answer into several text blocks, so only text after the last
// search result is the actual answer.
function extractAnswerText(content: AnthropicContentBlock[]): string {
	let lastResultIndex = -1;
	content.forEach((block, index) => {
		if (block.type === 'web_search_tool_result') lastResultIndex = index;
	});

	return content
		.slice(lastResultIndex + 1)
		.flatMap((block) => (block.type === 'text' && block.text ? [block.text] : []))
		.join('')
		.trim();
}

function parseFact(answer: string): HistoricalFact | null {
	const fact = answer.match(/FACT:\s*(.+)/)?.[1]?.trim();
	const source = answer.match(/SOURCE:\s*(.+)/)?.[1]?.trim();
	if (!fact || !source) return null;
	return { fact, source };
}

async function runLookup(currentDate: string): Promise<HistoricalFact | null> {
	const apiKey = await getAnthropicApiKey();
	const messages: { role: 'user' | 'assistant'; content: unknown }[] = [
		{ role: 'user', content: buildLookupPrompt(formatCalendarDay(currentDate)) }
	];
	const signal = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);

	for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
		const response = await fetch(ANTHROPIC_MESSAGES_URL, {
			method: 'POST',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': ANTHROPIC_VERSION,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: ANTHROPIC_MODEL,
				max_tokens: 8000,
				messages,
				tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }]
			}),
			signal
		});

		const payload = (await response.json().catch(() => null)) as AnthropicMessageResponse | null;
		if (!response.ok) {
			throw new Error(
				payload?.error?.message || `Historical fact lookup failed with status ${response.status}`
			);
		}

		const content = payload?.content ?? [];
		if (payload?.stop_reason === 'pause_turn') {
			// Resume by sending the paused turn back unchanged.
			messages.push({ role: 'assistant', content });
			continue;
		}

		return parseFact(extractAnswerText(content));
	}

	return null;
}

/**
 * Finds a web-verified "on this day" event for the Historical Context alternative.
 * Never throws: a failed lookup should not block the whole session, so the caller
 * falls back to the model's own knowledge when this returns null.
 */
export async function findHistoricalFact(currentDate: string): Promise<HistoricalFact | null> {
	try {
		return await runLookup(currentDate);
	} catch (error) {
		console.warn('Historical fact lookup failed, using model knowledge instead:', error);
		return null;
	}
}
