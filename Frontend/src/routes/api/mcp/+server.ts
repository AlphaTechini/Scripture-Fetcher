import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const session = await getSession(cookies);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);

	if (!body || !body.method) {
		return json({ error: 'Invalid MCP request' }, { status: 400 });
	}

	return json({
		jsonrpc: '2.0',
		id: body.id,
		result: { message: 'MCP endpoint active. Use Streamable HTTP transport for full functionality.' }
	});
};
