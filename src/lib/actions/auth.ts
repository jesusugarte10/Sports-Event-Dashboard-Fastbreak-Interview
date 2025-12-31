'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { safeAction } from './safe-action'

export async function signUpAction(formData: FormData) {
  return safeAction(async () => {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    const supabase = await createClient()
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      // Supabase error codes for existing users
      // Check if user already exists
      if (
        error.message.includes('already registered') ||
        error.message.includes('User already registered') ||
        error.message.includes('already exists') ||
        error.status === 422
      ) {
        // Provide helpful message suggesting Google sign-in or password reset
        throw new Error(
          'An account with this email already exists. If you signed up with Google, please use "Sign in with Google" instead. Otherwise, please sign in or use "Forgot Password" to reset your password.'
        )
      }
      throw error
    }
    
    return data
  })
}

export async function signInAction(formData: FormData) {
  return safeAction(async () => {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Supabase returns specific error messages for different scenarios
      // If credentials are invalid, it could be:
      // 1. Wrong password
      // 2. Account created with OAuth (no password set)
      // 3. Account doesn't exist
      
      if (
        error.message.includes('Invalid login credentials') ||
        error.message.includes('Invalid credentials') ||
        error.message.includes('Email not confirmed')
      ) {
        // Provide helpful message that covers both cases
        throw new Error(
          'Invalid email or password. If you signed up with Google, please use "Sign in with Google" instead. Otherwise, check your credentials or use "Forgot Password" to reset your password.'
        )
      }
      
      throw error
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  })
}

export async function resetPasswordAction(email: string) {
  return safeAction(async () => {
    if (!email) {
      throw new Error('Email is required')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) {
      // Provide helpful error messages
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error('No account found with this email address.')
      }
      throw error
    }
  })
}

export async function signOutAction() {
  return safeAction(async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    revalidatePath('/', 'layout')
    redirect('/login')
  })
}

export async function signInWithGoogleAction() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    if (data.url) {
      return { ok: true, url: data.url }
    }

    return { ok: false, error: 'No redirect URL received from Google OAuth' }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please check provider configuration.',
    }
  }
}

