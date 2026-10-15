import bcrypt from 'bcryptjs';
import { BCRYPT_MAX_PASSWORD_BYTES, PASSWORD_MIN_LENGTH } from './policy';

export function validatePassword(password: string): string | null {
	if (password.length < PASSWORD_MIN_LENGTH) {
		return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
	}
	if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
		return `Password must be at most ${BCRYPT_MAX_PASSWORD_BYTES} UTF-8 bytes`;
	}
	return null;
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await bcrypt.compare(password, hash);
	} catch {
		return false;
	}
}
