import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

async function getAI(): Promise<GoogleGenAI> {
	if (aiInstance) return aiInstance;

	let apiKey = '';
	try {
		const { env } = await import('$env/dynamic/private');
		apiKey = env.GEMINI_API_KEY;
	} catch {
		const { config } = await import('dotenv');
		config();
		apiKey = process.env.GEMINI_API_KEY || '';
	}

	aiInstance = new GoogleGenAI({ apiKey });
	return aiInstance;
}

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

function buildSystemPrompt(input: GenerateAlternativesInput): string {
	const historyNote = input.readingHistory.stories.length > 0
		? `Recently covered stories: ${input.readingHistory.stories.join(', ')}. Recently covered topics: ${input.readingHistory.topics.join(', ')}. Books recently read: ${input.readingHistory.books.join(', ')}. DO NOT repeat these.`
		: 'No reading history available. Feel free to select any story.';

	const userNotesNote = input.userNotes
		? `User specifically requested: "${input.userNotes}". Alternative 3 MUST directly address this interest.`
		: 'No additional notes provided. Alternative 3 should be a deeper exploration of the selected category from a different angle.';

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
Time of day: "${input.timeOfDay}" (secondary modifier: morning→energizing, night→peace/rest).
Time of year: "${input.timeOfYear}" (secondary modifier: Christmas→incarnation, Lent→sacrifice).
${historyNote}

ALTERNATIVE 2 — HISTORICAL CONTEXT (Date Driven):
Label: "Historical Context"
InfluenceType: "historical"
Heavily influenced by today's date: "${input.currentDate}".
Research what significant events happened on this date in church history, world history, or the biblical calendar.
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
	const ai = await getAI();
	const systemPrompt = buildSystemPrompt(input);

	const response = await ai.models.generateContent({
		model: 'gemini-2.5-flash',
		contents: systemPrompt,
		config: {
			temperature: 0.7,
			responseMimeType: 'application/json'
		}
	});

	const text = response.text;
	if (!text) {
		throw new Error('AI returned empty response');
	}

	let parsed: { alternatives: GeneratedAlternative[] };
	try {
		const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
		parsed = JSON.parse(cleaned);
	} catch {
		throw new Error(`Failed to parse AI response as JSON: ${text.slice(0, 200)}...`);
	}

	if (!parsed.alternatives || !Array.isArray(parsed.alternatives) || parsed.alternatives.length !== 3) {
		throw new Error('AI response must contain exactly 3 alternatives');
	}

	return parsed.alternatives;
}
