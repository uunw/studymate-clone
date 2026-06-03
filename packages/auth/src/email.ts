import nodemailer from 'nodemailer'

/**
 * Email sender abstraction.
 * - SMTP_HOST set  → send via SMTP (nodemailer).
 * - otherwise (dev) → print the message to the server console.
 */
type Mail = { to: string; subject: string; text: string; html?: string }

const from = process.env.SMTP_FROM ?? 'StudyMate <no-reply@studymate.local>'

const transporter = process.env.SMTP_HOST
	? nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT ?? 587),
			secure: Number(process.env.SMTP_PORT ?? 587) === 465,
			auth: process.env.SMTP_USER
				? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
				: undefined,
		})
	: null

export async function sendEmail({ to, subject, text, html }: Mail): Promise<void> {
	if (!transporter) {
		console.info(`\n📧 [dev email] to=${to}\n   subject: ${subject}\n   ${text}\n`)
		return
	}
	await transporter.sendMail({ from, to, subject, text, html: html ?? text })
}
