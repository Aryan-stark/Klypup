import { useState, type FormEvent } from 'react'
import { useLogin, useSignup } from '@/hooks/useAuth'

export default function Login() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ full_name: '', org_name: '', email: '', password: '' })

  const login = useLogin()
  const signup = useSignup()

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(loginForm)
  }

  const handleSignup = (e: FormEvent) => {
    e.preventDefault()
    signup.mutate(signupForm)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Klypup</h1>
          <p className="text-sm text-muted-foreground">Dynamic Pricing Intelligence</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
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
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full name</label>
              <input
                type="text"
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={signupForm.full_name}
                onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Organisation name</label>
              <input
                type="text"
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={signupForm.org_name}
                onChange={(e) => setSignupForm({ ...signupForm, org_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              />
            </div>
            {signup.error && (
              <p className="text-sm text-destructive">Account creation failed. Email may already exist.</p>
            )}
            <button
              type="submit"
              disabled={signup.isPending}
              className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
            >
              {signup.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
