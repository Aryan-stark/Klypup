import { useState, useEffect, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useLogin, useSignup } from '@/hooks/useAuth'
import { isValidEmail } from '@/lib/utils'

// ── Lamp / glow animation (adapted from Hero component, no next/link) ─────────

function LampBackground() {
  return (
    <div className="absolute top-0 isolate z-0 flex w-full flex-1 items-start justify-center pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute top-0 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />

      {/* Main glow blob */}
      <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-[-30%] rounded-full bg-primary/60 opacity-80 blur-3xl" />

      {/* Expanding lamp blur */}
      <motion.div
        initial={{ width: '8rem' }}
        animate={{ width: '16rem' }}
        transition={{ ease: 'easeInOut', delay: 0.2, duration: 0.9 }}
        className="absolute top-0 z-30 h-36 -translate-y-[20%] rounded-full bg-primary/60 blur-2xl"
      />

      {/* Top horizontal line */}
      <motion.div
        initial={{ width: '15rem' }}
        animate={{ width: '30rem' }}
        transition={{ ease: 'easeInOut', delay: 0.2, duration: 0.9 }}
        className="absolute inset-auto z-50 h-0.5 -translate-y-[-10%] bg-primary/60"
      />

      {/* Left conic gradient cone */}
      <motion.div
        initial={{ opacity: 0.5, width: '15rem' }}
        animate={{ opacity: 1, width: '30rem' }}
        transition={{ delay: 0.2, duration: 0.9, ease: 'easeInOut' }}
        className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] [--conic-position:from_70deg_at_center_top] bg-gradient-conic from-primary/60 via-transparent to-transparent"
      >
        <div className="absolute w-full left-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        <div className="absolute w-40 h-full left-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
      </motion.div>

      {/* Right conic gradient cone */}
      <motion.div
        initial={{ opacity: 0.5, width: '15rem' }}
        animate={{ opacity: 1, width: '30rem' }}
        transition={{ delay: 0.2, duration: 0.9, ease: 'easeInOut' }}
        className="absolute inset-auto left-1/2 h-56 w-[30rem] [--conic-position:from_290deg_at_center_top] bg-gradient-conic from-transparent via-transparent to-primary/60"
      >
        <div className="absolute w-40 h-full right-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
        <div className="absolute w-full right-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
      </motion.div>
    </div>
  )
}

// ── Input helper ──────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm bg-background transition-colors
    focus:outline-none focus:ring-2 focus:ring-ring
    ${hasError ? 'border-destructive focus:ring-destructive/40' : ''}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Login() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginEmailError, setLoginEmailError] = useState('')

  // Signup form
  const [signupForm, setSignupForm] = useState({ full_name: '', org_name: '', email: '', password: '' })
  const [signupEmailError, setSignupEmailError] = useState('')

  const login = useLogin()
  const signup = useSignup()
  const [slowWarning, setSlowWarning] = useState(false)

  useEffect(() => {
    const isPending = login.isPending || signup.isPending
    if (!isPending) { setSlowWarning(false); return }
    const t = setTimeout(() => setSlowWarning(true), 4000)
    return () => clearTimeout(t)
  }, [login.isPending, signup.isPending])

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateLoginEmail = (value: string) => {
    if (!value) { setLoginEmailError('Email is required'); return false }
    if (!isValidEmail(value)) { setLoginEmailError('Enter a valid email address'); return false }
    setLoginEmailError('')
    return true
  }

  const validateSignupEmail = (value: string) => {
    if (!value) { setSignupEmailError('Email is required'); return false }
    if (!isValidEmail(value)) { setSignupEmailError('Enter a valid email address'); return false }
    setSignupEmailError('')
    return true
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    if (!validateLoginEmail(loginForm.email)) return
    login.mutate(loginForm)
  }

  const handleSignup = (e: FormEvent) => {
    e.preventDefault()
    if (!validateSignupEmail(signupForm.email)) return
    signup.mutate(signupForm)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      <LampBackground />

      {/* Hero content + form — slides up on mount */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: 'easeInOut', delay: 0.35, duration: 0.8 }}
        className="relative z-50 flex flex-col items-center gap-10 px-4 w-full -mt-8"
      >
        {/* Brand */}
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
            Dynamic Pricing Intelligence
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Klypup
          </h1>
          <p className="text-foreground/75 text-base max-w-sm mx-auto leading-relaxed">
            AI agents workflow for Dynamic Pricing
            <br />Your team's final call.
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md rounded-2xl border bg-card/80 backdrop-blur-md shadow-xl p-8 space-y-6">

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === t
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* ── Sign in ── */}
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  className={inputCls(!!loginEmailError)}
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value })
                    if (loginEmailError) validateLoginEmail(e.target.value)
                  }}
                  onBlur={(e) => validateLoginEmail(e.target.value)}
                />
                {loginEmailError && (
                  <p className="text-xs text-destructive mt-0.5">{loginEmailError}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={inputCls(false)}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>

              {login.error && (
                <p className="text-sm text-destructive">Invalid email or password.</p>
              )}

              <button
                type="submit"
                disabled={login.isPending}
                className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </button>

              {slowWarning && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">
                  Backend is waking up — first request takes ~30s on the free tier
                </p>
              )}

              <p className="text-center text-xs text-muted-foreground pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Create one
                </button>
              </p>
            </form>

          ) : (
            /* ── Create account ── */
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Full name</label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Jane Smith"
                    className={inputCls(false)}
                    value={signupForm.full_name}
                    onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Organisation</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Corp"
                    className={inputCls(false)}
                    value={signupForm.org_name}
                    onChange={(e) => setSignupForm({ ...signupForm, org_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Work email</label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  className={inputCls(!!signupEmailError)}
                  value={signupForm.email}
                  onChange={(e) => {
                    setSignupForm({ ...signupForm, email: e.target.value })
                    if (signupEmailError) validateSignupEmail(e.target.value)
                  }}
                  onBlur={(e) => validateSignupEmail(e.target.value)}
                />
                {signupEmailError && (
                  <p className="text-xs text-destructive mt-0.5">{signupEmailError}</p>
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
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                />
              </div>

              {signup.error && (
                <p className="text-sm text-destructive">
                  Account creation failed. Email may already be in use.
                </p>
              )}

              <button
                type="submit"
                disabled={signup.isPending}
                className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {signup.isPending ? 'Creating account…' : 'Create account'}
              </button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground pb-8">
          Each account is its own isolated organisation — multi-tenant by design.
        </p>
      </motion.div>
    </div>
  )
}
