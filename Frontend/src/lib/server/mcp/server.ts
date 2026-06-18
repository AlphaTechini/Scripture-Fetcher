import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
	getReadingHistory,
	getPassagesRead,
	getComments,
	getUsageMetrics,
	getSessionDetails,
	getQuoteHistory,
	getAlternativesByType,
	getUnpickedAlternatives
} from './tools.js';

export function createMcpServer() {
	const server = new McpServer({
		name: 'scripture-fetcher',
		version: '1.0.0'
	});

	server.tool('get_reading_history', 'Returns recent Bible study sessions with alternatives', {}, async () => {
		const result = await getReadingHistory();
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_passages_read', 'Returns verses the user has marked as read', {}, async () => {
		const result = await getPassagesRead();
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_comments', 'Returns user comments on sessions', {}, async () => {
		const result = await getComments();
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_usage_metrics', 'Returns reading streak, total verses, category distribution', {}, async () => {
		const result = await getUsageMetrics();
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_session_details', 'Returns full details of a specific session', {
		sessionId: z.string().uuid().describe('Session ID')
	}, async ({ sessionId }) => {
		const result = await getSessionDetails(sessionId);
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_quote_history', 'Returns log of motivational quotes shown to user', {}, async () => {
		const result = await getQuoteHistory();
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_alternatives_by_type', 'Returns alternatives filtered by influence type', {
		influenceType: z.enum(['primary', 'historical', 'user_directed']).describe('Influence type')
	}, async ({ influenceType }) => {
		const result = await getAlternativesByType(influenceType);
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	server.tool('get_unpicked_alternatives', 'Returns unpicked alternatives for reuse', {
		mood: z.string().describe('Mood filter'),
		category: z.string().describe('Category filter')
	}, async ({ mood, category }) => {
		const result = await getUnpickedAlternatives(mood, category);
		return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
	});

	return server;
}
