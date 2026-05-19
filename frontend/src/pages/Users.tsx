import { useState } from 'react'
import { UserPlus, ShieldCheck, User, Copy, Check, Link as LinkIcon } from 'lucide-react'
import { useUsers, useCreateInvite, useUpdateUser } from '@/hooks/useUsers'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { isValidEmail } from '@/lib/utils'
import type { OrgUser, Invitation } from '@/types/user'

export default function Users() {
  const { data, isLoading } = useUsers()
  const createInvite = useCreateInvite()
  const updateUser = useUpdateUser()

  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'pricing_analyst' as 'admin' | 'pricing_analyst' })
  const [emailError, setEmailError] = useState('')
  const [inviteError, setInviteError] = useState('')

  // Generated invite — shown after a successful createInvite call
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null)
  const [copied, setCopied] = useState(false)

  const validateEmail = (value: string) => {
    if (!value) { setEmailError('Email is required'); return false }
    if (!isValidEmail(value)) { setEmailError('Enter a valid email address'); return false }
    setEmailError('')
    return true
  }

  const users: OrgUser[] = (data?.data ?? []) as OrgUser[]

  const inviteUrl = generatedInvite
    ? `${window.location.origin}/join?token=${generatedInvite.token}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')
    if (!validateEmail(form.email)) return
    try {
      const res = await createInvite.mutateAsync(form)
      setGeneratedInvite(res.data)
      setForm({ email: '', role: 'pricing_analyst' })
      setEmailError('')
    } catch {
      setInviteError('Failed to create invite. The email may already belong to an existing user.')
    }
  }

  const handleNewInvite = () => {
    setGeneratedInvite(null)
    setInviteError('')
    setCopied(false)
  }

  const toggleActive = (user: OrgUser) => {
    updateUser.mutate({ id: user.id, data: { is_active: !user.is_active } })
  }

  const changeRole = (user: OrgUser, role: 'admin' | 'pricing_analyst') => {
    updateUser.mutate({ id: user.id, data: { role } })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users in your organisation.</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setGeneratedInvite(null); setInviteError('') }}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="glass-card rounded-lg p-5 space-y-4">
          {generatedInvite ? (
            /* ── Step 2: invite link generated ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Invite link ready</p>
                  <p className="text-xs text-muted-foreground">
                    Send this link to <span className="font-medium">{generatedInvite.email}</span>.
                    It expires in 7 days and can only be used once.
                  </p>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Role:</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  generatedInvite.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {generatedInvite.role === 'admin' ? 'Admin' : 'Pricing Analyst'}
                </span>
              </div>

              {/* Link copy box */}
              <div className="rounded-md border bg-muted/40 flex items-center gap-2 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="flex-1 text-xs text-foreground/80 truncate">{inviteUrl}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium
                             text-primary hover:text-primary/80 transition-colors"
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> Copied</>
                    : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleNewInvite}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                >
                  Invite another
                </button>
                <button
                  onClick={() => { setShowInvite(false); setGeneratedInvite(null) }}
                  className="px-4 py-2 rounded-md border text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ── Step 1: email + role form ── */
            <>
              <div>
                <h2 className="text-sm font-semibold">Invite a team member</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We'll generate a link they can use to create their own password.
                </p>
              </div>
              <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Work email</label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="colleague@company.com"
                    className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${emailError ? 'border-destructive' : ''}`}
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value })
                      if (emailError) validateEmail(e.target.value)
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive mt-0.5">{emailError}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                  >
                    <option value="pricing_analyst">Pricing Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {inviteError && (
                  <p className="col-span-2 text-sm text-destructive">{inviteError}</p>
                )}
                <div className="col-span-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={createInvite.isPending}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {createInvite.isPending ? 'Generating…' : 'Generate invite link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="px-4 py-2 rounded-md border text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* User table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="glass-card rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        {u.role === 'admin'
                          ? <ShieldCheck className="h-4 w-4 text-purple-600" />
                          : <User className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as 'admin' | 'pricing_analyst')}
                      className="rounded border px-2 py-1 text-xs bg-background"
                    >
                      <option value="pricing_analyst">Pricing Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(u)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {u.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
