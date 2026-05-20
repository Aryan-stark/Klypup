import { useState } from 'react'
import { UserPlus, ShieldCheck, User, Copy, Check, Link as LinkIcon, Mail } from 'lucide-react'
import { useUsers, useInviteUser, useCreateInvite, useUpdateUser } from '@/hooks/useUsers'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { isValidEmail } from '@/lib/utils'
import type { OrgUser, Invitation } from '@/types/user'

type Panel = 'none' | 'add' | 'invite'

export default function Users() {
  const { data, isLoading } = useUsers()
  const inviteUser = useInviteUser()
  const createInvite = useCreateInvite()
  const updateUser = useUpdateUser()

  const [panel, setPanel] = useState<Panel>('none')

  // ── Add member form ──────────────────────────────────────────────────────────
  const [addForm, setAddForm] = useState({
    email: '', full_name: '', password: '', role: 'pricing_analyst' as 'admin' | 'pricing_analyst',
  })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [addApiError, setAddApiError] = useState('')

  // ── Invite-link form ─────────────────────────────────────────────────────────
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'pricing_analyst' as 'admin' | 'pricing_analyst' })
  const [inviteEmailError, setInviteEmailError] = useState('')
  const [inviteApiError, setInviteApiError] = useState('')
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null)
  const [copied, setCopied] = useState(false)

  const users: OrgUser[] = (data?.data ?? []) as OrgUser[]

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const openPanel = (p: Panel) => {
    setPanel(p)
    setAddErrors({})
    setAddApiError('')
    setInviteEmailError('')
    setInviteApiError('')
    setGeneratedInvite(null)
    setCopied(false)
  }

  // ── Add member submit ────────────────────────────────────────────────────────
  const validateAdd = () => {
    const errs: Record<string, string> = {}
    if (!addForm.email) errs.email = 'Email is required'
    else if (!isValidEmail(addForm.email)) errs.email = 'Enter a valid email'
    if (!addForm.full_name.trim()) errs.full_name = 'Name is required'
    if (!addForm.password) errs.password = 'Password is required'
    else if (addForm.password.length < 8) errs.password = 'Minimum 8 characters'
    setAddErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddApiError('')
    if (!validateAdd()) return
    try {
      await inviteUser.mutateAsync(addForm)
      setAddForm({ email: '', full_name: '', password: '', role: 'pricing_analyst' })
      openPanel('none')
    } catch {
      setAddApiError('Failed to add member. The email may already be in use.')
    }
  }

  // ── Invite-link submit ───────────────────────────────────────────────────────
  const validateInviteEmail = (value: string) => {
    if (!value) { setInviteEmailError('Email is required'); return false }
    if (!isValidEmail(value)) { setInviteEmailError('Enter a valid email'); return false }
    setInviteEmailError('')
    return true
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteApiError('')
    if (!validateInviteEmail(inviteForm.email)) return
    try {
      const res = await createInvite.mutateAsync(inviteForm)
      setGeneratedInvite(res.data)
      setInviteForm({ email: '', role: 'pricing_analyst' })
    } catch {
      setInviteApiError('Failed to generate invite. The email may already belong to an existing user.')
    }
  }

  const inviteUrl = generatedInvite
    ? `${window.location.origin}/join?token=${generatedInvite.token}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleActive = (user: OrgUser) =>
    updateUser.mutate({ id: user.id, data: { is_active: !user.is_active } })

  const changeRole = (user: OrgUser, role: 'admin' | 'pricing_analyst') =>
    updateUser.mutate({ id: user.id, data: { role } })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users in your organisation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPanel(panel === 'invite' ? 'none' : 'invite')}
            className="flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Invite via link
          </button>
          <button
            onClick={() => openPanel(panel === 'add' ? 'none' : 'add')}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </button>
        </div>
      </div>

      {/* ── Add member panel ── */}
      {panel === 'add' && (
        <div className="glass-card rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Add team member</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create an account directly — credentials are shared with the new member.
            </p>
          </div>
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Work email</label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="colleague@company.com"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${addErrors.email ? 'border-destructive' : ''}`}
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
              {addErrors.email && <p className="text-xs text-destructive">{addErrors.email}</p>}
            </div>

            {/* Full name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <input
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${addErrors.full_name ? 'border-destructive' : ''}`}
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
              />
              {addErrors.full_name && <p className="text-xs text-destructive">{addErrors.full_name}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${addErrors.password ? 'border-destructive' : ''}`}
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
              {addErrors.password && <p className="text-xs text-destructive">{addErrors.password}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as typeof addForm.role })}
              >
                <option value="pricing_analyst">Pricing Analyst</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {addApiError && (
              <p className="col-span-2 text-sm text-destructive">{addApiError}</p>
            )}

            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={inviteUser.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {inviteUser.isPending ? 'Creating…' : 'Create member'}
              </button>
              <button
                type="button"
                onClick={() => openPanel('none')}
                className="px-4 py-2 rounded-md border text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Invite via link panel ── */}
      {panel === 'invite' && (
        <div className="glass-card rounded-lg p-5 space-y-4">
          {generatedInvite ? (
            /* Step 2: link ready */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Invite link ready</p>
                  <p className="text-xs text-muted-foreground">
                    Send this to <span className="font-medium">{generatedInvite.email}</span>.
                    Expires in 7 days and can only be used once.
                  </p>
                </div>
              </div>
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
              <div className="rounded-md border bg-muted/40 flex items-center gap-2 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="flex-1 text-xs text-foreground/80 truncate">{inviteUrl}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> Copied</>
                    : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setGeneratedInvite(null); setCopied(false) }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                >
                  Invite another
                </button>
                <button
                  onClick={() => openPanel('none')}
                  className="px-4 py-2 rounded-md border text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: email + role */
            <>
              <div>
                <h2 className="text-sm font-semibold">Invite via link</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate a one-time link the invitee uses to set their own password.
                </p>
              </div>
              <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Work email</label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="colleague@company.com"
                    className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${inviteEmailError ? 'border-destructive' : ''}`}
                    value={inviteForm.email}
                    onChange={(e) => {
                      setInviteForm({ ...inviteForm, email: e.target.value })
                      if (inviteEmailError) validateInviteEmail(e.target.value)
                    }}
                    onBlur={(e) => validateInviteEmail(e.target.value)}
                  />
                  {inviteEmailError && <p className="text-xs text-destructive">{inviteEmailError}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as typeof inviteForm.role })}
                  >
                    <option value="pricing_analyst">Pricing Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {inviteApiError && (
                  <p className="col-span-2 text-sm text-destructive">{inviteApiError}</p>
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
                    onClick={() => openPanel('none')}
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No team members yet. Add one above.
                  </td>
                </tr>
              ) : users.map((u) => (
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
