import { config } from 'dotenv';
import postgres from 'postgres';

config();

const sql = postgres(process.env.DATABASE_URL!);

async function updateCommentsPolicy() {
	console.log('Updating comments RLS policy...');
	
	await sql`DROP POLICY IF EXISTS "Users can create own comments" ON comments`;
	
	await sql`
		CREATE POLICY "Users can create own comments on own sessions"
		ON comments FOR INSERT
		WITH CHECK (
			auth.uid() = user_id
			AND EXISTS (
				SELECT 1 FROM sessions
				WHERE sessions.id = comments.session_id
				AND sessions.user_id = auth.uid()
			)
		)
	`;
	
	console.log('Comments RLS policy updated');
	await sql.end();
}

updateCommentsPolicy().catch((err) => {
	console.error('Failed:', err.message);
	process.exit(1);
});
