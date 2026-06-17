import { config } from 'dotenv';
import postgres from 'postgres';

config();

const client = postgres(process.env.DATABASE_URL!);

async function cleanup() {
	console.log('Cleaning up test data...');

	await client`DELETE FROM quote_logs`;
	await client`DELETE FROM bookmarks`;
	await client`DELETE FROM verses_read`;
	await client`DELETE FROM comments`;
	await client`DELETE FROM prayer_points`;
	await client`DELETE FROM passages`;
	await client`DELETE FROM alternatives`;
	await client`DELETE FROM sessions`;
	await client`DELETE FROM motivational_quotes`;
	await client`DELETE FROM users`;

	console.log('Cleanup complete');
	await client.end();
}

cleanup();
