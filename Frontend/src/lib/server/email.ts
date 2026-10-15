import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<string> {
	const apiKey = env.RESEND_API_KEY;
	const fromAddress = env.RESEND_FROM_EMAIL;
	if (!apiKey || !fromAddress) {
		throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required to send email');
	}

	const resend = new Resend(apiKey);
	const result = await resend.emails.send({
		from: fromAddress,
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
