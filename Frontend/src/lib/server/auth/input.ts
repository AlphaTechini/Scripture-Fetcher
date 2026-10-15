import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export function parseEmail(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const result = emailSchema.safeParse(value);
	return result.success ? result.data : null;
}
