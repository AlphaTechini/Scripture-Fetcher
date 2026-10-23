export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_MODEL = 'claude-haiku-5-5';
export const ANTHROPIC_VERSION = '2023-06-01';

export interface AnthropicContentBlock {
	type: string;
	text?: string;
}

export interface AnthropicMessageResponse {
	content?: AnthropicContentBlock[];
	stop_reason?: string | null;
	error?: {
		message?: string;
	};
}

export async function getAnthropicApiKey(): Promise<string> {
	try {
		const { env } = await import('$env/dynamic/private');
		if (env.ANTHROPIC_API_KEY) return env.ANTHROPIC_API_KEY;
	} catch {
		// Standalone verification scripts do not have SvelteKit's environment module.
	}

	{
		const { config } = await import('dotenv');
		config();
		if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
	}

	throw new Error('ANTHROPIC_API_KEY environment variable is required');
}
