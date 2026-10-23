import {
	ANTHROPIC_MESSAGES_URL,
	ANTHROPIC_MODEL,
	ANTHROPIC_VERSION,
	getAnthropicApiKey,
	type AnthropicMessageResponse
} from './anthropic';
import { findHistoricalFact, type HistoricalFact } from './historical-fact';

// Haiku 5.5 caps output at 128K tokens; this leaves headroom for thinking tokens plus long multi-chapter passages.
const MAX_OUTPUT_TOKENS = 64000;

// Structured outputs reject numeric and string-length constraints, so the exactly-3-alternatives rule stays enforced in code below.
const ALTERNATIVES_OUTPUT_SCHEMA = {
	type: 'object',
	properties: {
		alternatives: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					label: { type: 'string' },
					influenceType: { type: 'string', enum: ['primary', 'historical', 'user_directed'] },
					storyTitle: { type: 'string' },
					storySummary: { type: 'string' },
					reasoning: { type: 'string' },
					passages: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								reference: { type: 'string' },
								passageText: { type: 'string' },
								book: { type: 'string' },
								chapter: { type: 'string' },
								orderIndex: { type: 'number' }
							},
							required: ['reference', 'passageText', 'book', 'chapter', 'orderIndex'],
							additionalProperties: false
						}
					},
					prayerPoints: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								content: { type: 'string' },
								passageRef: { anyOf: [{ type: 'string' }, { type: 'null' }] },
								orderIndex: { type: 'number' }
							},
							required: ['content', 'passageRef', 'orderIndex'],
							additionalProperties: false
						}
					}
				},
				required: [
					'label',
					'influenceType',
					'storyTitle',
					'storySummary',
					'reasoning',
					'passages',
					'prayerPoints'
				],
				additionalProperties: false
			}
		}
	},
	required: ['alternatives'],
	additionalProperties: false
};

export interface GeneratedPassage {
	reference: string;
	passageText: string;
	book: string;
	chapter: string;
	orderIndex: number;
}

export interface GeneratedPrayerPoint {
	content: string;
	passageRef: string | null;
	orderIndex: number;
}

export interface GeneratedAlternative {
	label: string;
	influenceType: 'primary' | 'historical' | 'user_directed';
	storyTitle: string;
	storySummary: string;
	reasoning: string;
	passages: GeneratedPassage[];
	prayerPoints: GeneratedPrayerPoint[];
}

export interface GenerateAlternativesInput {
	mood: string;
	category: string;
	timeOfDay: string;
	timeOfYear: string;
	currentDate: string;
	userNotes?: string;
	readingHistory: {
		stories: string[];
		topics: string[];
		books: string[];
	};
}

function buildHistoricalNote(historicalFact: HistoricalFact | null): string {
	if (historicalFact) {
		return `A web search confirmed this event for today: "${historicalFact.fact}" (source: ${historicalFact.source}).
Build this alternative around that event. Do not swap it for a different one.
The storySummary MUST open with one sentence stating this event and its year, ending with "(source: ${historicalFact.source})", then summarize the Bible story.`;
	}

	return `Pick a widely documented event from church history, world history, or the biblical calendar that happened on this calendar day. Only use an event you are confident about.
The storySummary MUST open with one sentence stating the event and its year, then summarize the Bible story. If you are not certain of the exact day, open with "Around this time of year" instead of claiming the date.`;
}

function buildSystemPrompt(
	input: GenerateAlternativesInput,
	historicalFact: HistoricalFact | null
): string {
	const historyNote =
		input.readingHistory.stories.length > 0
			? `Recently covered stories: ${input.readingHistory.stories.join(', ')}. Recently covered topics: ${input.readingHistory.topics.join(', ')}. Books recently read: ${input.readingHistory.books.join(', ')}. DO NOT repeat these.`
			: 'No reading history available. Feel free to select any story.';

	const userNotesNote = input.userNotes
		? `User specifically requested: "${input.userNotes}". Alternative 3 MUST directly address this interest.`
		: 'No additional notes provided. Alternative 3 should be a deeper exploration of the selected category from a different angle.';

	// Without this, a category like "Provision" pulls toward famine and crisis stories even when the user is celebrating.
	const userWordsNote = input.userNotes
		? `The user described their situation in their own words: "${input.userNotes}". Use these words to interpret the mood and category: they outweigh any generic reading of the category name.`
		: '';

	return `You are a Bible study guide. Return exactly 3 complete Bible story alternatives based on the user's inputs.

RULES FOR ALL ALTERNATIVES:
- Each alternative is a COMPLETE BIBLE STORY, not a single passage.
- Include ALL key passages that form the complete narrative arc (beginning, middle, end).
- Span multiple chapters when needed. Cross book boundaries when thematically linked.
- Minimum 2 passages per alternative, no hard maximum.
- Maintain narrative order (chronological as they appear in the biblical narrative).
- Use KJV translation for all passage text.
- Provide ACCURATE, verifiable scripture text. Never invent or paraphrase verses.

ALTERNATIVE 1 — PRIMARY (Category + Mood Driven):
Label: "Primary"
InfluenceType: "primary"
Heavily influenced by mood: "${input.mood}" and category: "${input.category}".
The mood sets the emotional register. The story's tone must match how the user feels right now (for example, joyful → thanksgiving, celebration, harvest, fulfilled promises; anxious → reassurance in the middle of trouble).
Pick a story that fits the category AND the mood together. Do not default to stories centered on hardship, famine, or persecution unless the mood or the user's words point there.
${userWordsNote}
Time of day: "${input.timeOfDay}" (secondary modifier: morning→energizing, night→peace/rest).
Time of year: "${input.timeOfYear}" (secondary modifier: Christmas→incarnation, Lent→sacrifice).
${historyNote}

ALTERNATIVE 2 — HISTORICAL CONTEXT (Date Driven):
Label: "Historical Context"
InfluenceType: "historical"
Heavily influenced by today's date: "${input.currentDate}".
${buildHistoricalNote(historicalFact)}
Identify a Bible story whose themes connect to that historical event.
This alternative must be different from Alternative 1.

ALTERNATIVE 3 — USER-DIRECTED (Notes Driven):
Label: "Your Interest"
InfluenceType: "user_directed"
${userNotesNote}

PRAYER POINTS:
- Generate 8-15 prayer points per alternative, scaled to the story's depth.
- Prayer points should trace the narrative arc: opening points reflect the beginning, middle points engage with conflict/turning point, closing points draw from resolution.
- Each prayer point should be personal, actionable, and grounded in a specific passage.
- Reference which passage each prayer point draws from.
- Format: short declarative sentences the user can pray aloud.

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "alternatives": [
    {
      "label": "string",
      "influenceType": "primary" | "historical" | "user_directed",
      "storyTitle": "string",
      "storySummary": "string (2-3 sentences)",
      "reasoning": "string (why this story was chosen)",
      "passages": [
        {
          "reference": "string (e.g., '1 Samuel 17:1-11')",
          "passageText": "string (full KJV text)",
          "book": "string",
          "chapter": "string",
          "orderIndex": number
        }
      ],
      "prayerPoints": [
        {
          "content": "string",
          "passageRef": "string or null",
          "orderIndex": number
        }
      ]
    }
  ]
}`;
}

export async function generateAlternatives(
	input: GenerateAlternativesInput
): Promise<GeneratedAlternative[]> {
	const apiKey = await getAnthropicApiKey();
	const historicalFact = await findHistoricalFact(input.currentDate);
	const systemPrompt = buildSystemPrompt(input, historicalFact);
	const response = await fetch(ANTHROPIC_MESSAGES_URL, {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': ANTHROPIC_VERSION,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: ANTHROPIC_MODEL,
			max_tokens: MAX_OUTPUT_TOKENS,
			messages: [{ role: 'user', content: systemPrompt }],
			output_config: {
				format: {
					type: 'json_schema',
					schema: ALTERNATIVES_OUTPUT_SCHEMA
				}
			}
		})
	});

	const payload = (await response.json().catch(() => null)) as AnthropicMessageResponse | null;
	if (!response.ok) {
		throw new Error(
			payload?.error?.message || `Anthropic request failed with status ${response.status}`
		);
	}

	if (payload?.stop_reason === 'refusal') {
		throw new Error('Anthropic declined this generation request');
	}
	if (payload?.stop_reason === 'max_tokens') {
		throw new Error('Anthropic response was truncated before the JSON completed');
	}

	// Adaptive thinking blocks come first, so collect the answer from text blocks only.
	const text = (payload?.content ?? [])
		.flatMap((block) => (block.type === 'text' && block.text ? [block.text] : []))
		.join('');

	if (!text) {
		throw new Error('Anthropic returned an empty response');
	}

	let parsed: { alternatives: GeneratedAlternative[] };
	try {
		const cleaned = text
			.replace(/```json\s*/g, '')
			.replace(/```\s*/g, '')
			.trim();
		parsed = JSON.parse(cleaned);
	} catch {
		throw new Error(`Failed to parse AI response as JSON: ${text.slice(0, 200)}...`);
	}

	if (
		!parsed.alternatives ||
		!Array.isArray(parsed.alternatives) ||
		parsed.alternatives.length !== 3
	) {
		throw new Error('AI response must contain exactly 3 alternatives');
	}

	return parsed.alternatives;
}
