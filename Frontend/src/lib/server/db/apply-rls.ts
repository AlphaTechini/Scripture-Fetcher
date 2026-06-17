import { config } from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'fs';

config();

const sql = readFileSync('./drizzle/0000_rls_policies.sql', 'utf-8');
const client = postgres(process.env.DATABASE_URL!);

async function applyRLS() {
	console.log('Applying RLS policies...');
	await client.unsafe(sql);
	console.log('RLS policies applied successfully');
	await client.end();
}

applyRLS().catch((err) => {
	console.error('Failed to apply RLS:', err.message);
	process.exit(1);
});
