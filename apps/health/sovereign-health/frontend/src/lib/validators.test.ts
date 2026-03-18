import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './validators'

describe('signupSchema', () => {

  const validSignup = {
    email: 'test@example.com',
    password: 'SecurePass1',
    confirm_password: 'SecurePass1',
    country: 'DE',
    tos_accepted: true,
    age_confirmed: true,
  }

  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validSignup)
    expect(result.success).toBe(true)
  })

  it('accepts signup with display_name', () => {
    const result = signupSchema.safeParse({ ...validSignup, display_name: 'Test User' })
    expect(result.success).toBe(true)
  })

  describe('email validation', () => {
    it('rejects empty email', () => {
      const result = signupSchema.safeParse({ ...validSignup, email: '' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
      const result = signupSchema.safeParse({ ...validSignup, email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects email without domain', () => {
      const result = signupSchema.safeParse({ ...validSignup, email: 'user@' })
      expect(result.success).toBe(false)
    })
  })

  describe('password validation', () => {
    it('rejects password under 8 chars', () => {
      const result = signupSchema.safeParse({ ...validSignup, password: 'Pass1', confirm_password: 'Pass1' })
      expect(result.success).toBe(false)
    })

    it('rejects password over 128 chars', () => {
      const longPass = 'A1' + 'a'.repeat(127)
      const result = signupSchema.safeParse({ ...validSignup, password: longPass, confirm_password: longPass })
      expect(result.success).toBe(false)
    })

    it('rejects password without letter', () => {
      const result = signupSchema.safeParse({ ...validSignup, password: '12345678', confirm_password: '12345678' })
      expect(result.success).toBe(false)
    })

    it('rejects password without number', () => {
      const result = signupSchema.safeParse({ ...validSignup, password: 'abcdefgh', confirm_password: 'abcdefgh' })
      expect(result.success).toBe(false)
    })

    it('rejects mismatched password confirmation', () => {
      const result = signupSchema.safeParse({ ...validSignup, confirm_password: 'DifferentPass1' })
      expect(result.success).toBe(false)
    })

    it('accepts password with special characters', () => {
      const result = signupSchema.safeParse({ ...validSignup, password: 'P@ssw0rd!#$', confirm_password: 'P@ssw0rd!#$' })
      expect(result.success).toBe(true)
    })
  })

  describe('TOS and age', () => {
    it('rejects when TOS not accepted', () => {
      const result = signupSchema.safeParse({ ...validSignup, tos_accepted: false })
      expect(result.success).toBe(false)
    })

    it('rejects when age not confirmed', () => {
      const result = signupSchema.safeParse({ ...validSignup, age_confirmed: false })
      expect(result.success).toBe(false)
    })
  })

  describe('display_name', () => {
    it('accepts empty display_name', () => {
      const result = signupSchema.safeParse({ ...validSignup, display_name: '' })
      expect(result.success).toBe(true)
    })

    it('rejects display_name over 100 chars', () => {
      const result = signupSchema.safeParse({ ...validSignup, display_name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('optional consents', () => {
    it('accepts consent fields', () => {
      const result = signupSchema.safeParse({
        ...validSignup,
        consent_product_updates: true,
        consent_newsletter: false,
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'anypassword' })
    expect(result.success).toBe(true)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'pass' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('does not enforce password strength (login accepts any password)', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'x' })
    expect(result.success).toBe(true)
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts valid reset data', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewSecure1',
      confirm_password: 'NewSecure1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'abc',
      confirm_password: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewSecure1',
      confirm_password: 'Different1',
    })
    expect(result.success).toBe(false)
  })

  it('enforces same rules as signup password', () => {
    // No number
    const r1 = resetPasswordSchema.safeParse({ password: 'abcdefgh', confirm_password: 'abcdefgh' })
    expect(r1.success).toBe(false)

    // No letter
    const r2 = resetPasswordSchema.safeParse({ password: '12345678', confirm_password: '12345678' })
    expect(r2.success).toBe(false)
  })
})
