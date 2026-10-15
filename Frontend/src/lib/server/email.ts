import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Verified sender identity is baked in so OTP delivery cannot break on missing or unverified config.
const FROM_EMAIL = 'Scripture Fetcher <noreply@cyberpunkinc.xyz>';

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<string> {
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error('RESEND_API_KEY is required to send email');
	}

	const resend = new Resend(apiKey);
	const result = await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject,
		html,
		text
	});
	if (result.error) {
		throw new Error('The email provider rejected the message', { cause: result.error });
	}
	if (!result.data?.id) {
		throw new Error('The email provider did not return a message identifier');
	}
	return result.data.id;
}
