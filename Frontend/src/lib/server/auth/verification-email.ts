import { sendEmail } from '../email';

export async function sendOtpEmail(email: string, code: string): Promise<void> {
	const html = `
		<div style="font-family: 'Cormorant Garamond', Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #F5E6C8; color: #3E2723; border: 2px solid #C9A84C; border-radius: 8px;">
			<h1 style="font-family: 'Cinzel', serif; color: #1A1A1A; font-size: 24px; margin: 0 0 16px 0; text-align: center;">Scripture Fetcher</h1>
			<p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">Your verification code is:</p>
			<div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; padding: 20px; background: #E8D5B7; border: 2px solid #C9A84C; border-radius: 6px; color: #1A1A1A;">${code}</div>
			<p style="font-size: 14px; line-height: 1.5; margin: 24px 0 0 0; color: #5D4037;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
		</div>
	`;
	const text = `Your Scripture Fetcher verification code is: ${code}\n\nThis code expires in 10 minutes.`;

	await sendEmail({
		to: email,
		subject: 'Your Scripture Fetcher verification code',
		html,
		text
	});
}
