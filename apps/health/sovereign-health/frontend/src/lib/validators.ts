import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .refine(p => /[a-zA-Z]/.test(p), 'Password must contain at least 1 letter')
    .refine(p => /[0-9]/.test(p), 'Password must contain at least 1 number'),
  confirm_password: z.string(),
  display_name: z.string().max(100, 'Name must be at most 100 characters').optional(),
  tos_accepted: z.literal(true, { error: 'You must accept the Terms of Service' }),
  age_confirmed: z.literal(true, { error: 'You must be at least 18 years old to register' }),
  consent_product_updates: z.boolean().optional(),
  consent_newsletter: z.boolean().optional(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .refine(p => /[a-zA-Z]/.test(p), 'Password must contain at least 1 letter')
    .refine(p => /[0-9]/.test(p), 'Password must contain at least 1 number'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
