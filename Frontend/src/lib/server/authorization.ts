import { db } from './db';
import { sessions } from './db/schema';
import { and, eq } from 'drizzle-orm';

export async function userOwnsSession(userId: string, sessionId: string): Promise<boolean> {
	const rows = await db
		.select({ id: sessions.id })
		.from(sessions)
		.where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
		.limit(1);
	return rows.length === 1;
}
