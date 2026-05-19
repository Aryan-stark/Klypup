/**
 * Join.tsx — Public page for accepting an invitation.
 *
 * URL: /join?token=<token>
 *
 * Flow:
 *   1. On mount: GET /users/invitations/{token} — loads org name + email + role
 *   2. User fills in full name + password
 *   3. POST /users/invitations/{token}/accept → returns JWT tokens
 *   4. Tokens are saved to authStore → user is immediately logged in → /dashboard
 *
 * Invalid / expired / already-used tokens show an error state with a link back to /login.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, User, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import type { Invitation } from '@/types/user'

function inputCls(hasError: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm bg-background transition-colors
    focus:outline-none focus:ring-2 focus:ring-ring
    ${hasError ? 'border-destructive focus:ring-destructive/40' : ''}`
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  pricing_analyst: 'Pricing Analyst',
}

export default function Join() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const setAuth = useAuthStore((s) => s.setAuth)

  // Invite metadata loaded on mount
  const [invite, setInvite] = useState<Invitation | null>(null)
  const [loadError, setLoadError] = useState('')

  // Registration form
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Load invite metadata
  useEffect(() => {
    if (!token) {
      setLoadError('No invite token found in the URL.')
      return
    }
    userService
      .getInvite(token)
      .then((res) => setInvite(res.data))
      .catch((err) => {
        const detail = err?.response?.data?.detail
        if (err?.response?.status === 410) {
          setLoadError(detail ?? 'This invitation has expired or has already been used.')
        } else if (err?.response?.status === 404) {
          setLoadError('Invitation not found. The link may be incorrect.')
        } else {
          setLoadError('Could not load invitation. Please try again.')
        }
      })
  }, [token])

  const validate = () => {
    if (!fullName.trim()) {
      setNameError('Full name is required')
      return false
    }
    setNameError('')
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await userService.acceptInvite(token, {
        full_name: fullName.trim(),
        password,
      })
      const { access_token, refresh_token } = res.data
      // Set the token early so authService.me() can attach it to the request
      useAuthStore.getState().setAccessToken(access_token)
      const me = await authService.me()
      setAuth(me.data, access_token, refresh_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
      setSubmitError(detail ?? 'Failed to create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Token missing / invalid state ──────────────────────────────────────────

  if (!token || loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border bg-card shadow-lg p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Invalid invitation</h1>
          <p className="text-sm text-muted-foreground">
            {loadError || 'This invite link is invalid or has expired.'}
          </p>
          <Link
            to="/login"
            className="inline-block mt-2 text-sm text-primary hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Join form ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: 'easeOut', duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            {invite.role === 'admin'
              ? <ShieldCheck className="h-6 w-6 text-primary" />
              : <User className="h-6 w-6 text-primary" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">You've been invited</h1>
          <p className="text-sm text-muted-foreground">
            Join <span className="font-medium text-foreground">{invite.org_name ?? 'your organisation'}</span> as a{' '}
            <span className="font-medium text-foreground">{ROLE_LABEL[invite.role] ?? invite.role}</span>
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-8 space-y-5">
          {/* Pre-filled email pill */}
          <div className="rounded-md bg-muted/60 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                Signing up as
              </p>
              <p className="text-sm font-medium text-foreground">{invite.email}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full name</label>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className={inputCls(!!nameError)}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (nameError) setNameError('')
                }}
                onBlur={() => {
                  if (!fullName.trim()) setNameError('Full name is required')
                }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className={inputCls(false)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm
                         font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {submitting ? 'Creating account…' : 'Create account & sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
