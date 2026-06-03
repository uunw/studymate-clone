import { z } from 'zod'
import { STRONG_PASSWORD_RE, STUDENT_ID_RE } from '../constants'

export const studentId = z.string().trim().regex(STUDENT_ID_RE, 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก')

export const strongPassword = z
	.string()
	.regex(STRONG_PASSWORD_RE, 'รหัสผ่านต้องมีตัวอักษร ตัวเลข และอักขระพิเศษ อย่างน้อย 8 ตัว')

export const signInSchema = z.object({
	studentId,
	password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})
export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = z
	.object({
		studentId,
		firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(256),
		lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(256),
		nickname: z.string().trim().min(1, 'กรุณากรอกชื่อเล่น').max(256),
		password: strongPassword,
		passwordConfirm: z.string(),
	})
	.refine((v) => v.password === v.passwordConfirm, {
		message: 'ยืนยันรหัสผ่านไม่ตรงกัน',
		path: ['passwordConfirm'],
	})
export type SignUpInput = z.infer<typeof signUpSchema>

export const otpRequestSchema = z.object({ studentId })
export const otpVerifySchema = z.object({
	studentId,
	otp: z
		.string()
		.trim()
		.regex(/^\d{6}$/, 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก'),
})
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1),
		newPassword: strongPassword,
		newPasswordConfirm: z.string(),
	})
	.refine((v) => v.newPassword === v.newPasswordConfirm, {
		message: 'ยืนยันรหัสผ่านไม่ตรงกัน',
		path: ['newPasswordConfirm'],
	})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
