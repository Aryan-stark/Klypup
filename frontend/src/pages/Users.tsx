import { useState } from 'react'
import { UserPlus, ShieldCheck, User } from 'lucide-react'
import { useUsers, useInviteUser, useUpdateUser } from '@/hooks/useUsers'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { isValidEmail } from '@/lib/utils'
import type { OrgUser } from '@/types/user'

export default function Users() {
  const { data, isLoading } = useUsers()
  const invite = useInviteUser()
  const updateUser = useUpdateUser()

  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'pricing_analyst' as const,
  })
  const [emailError, setEmailError] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const validateEmail = (value: string) => {
    if (!value) { setEmailError('Email is required'); return false }
    if (!isValidEmail(value)) { setEmailError('Enter a valid email address'); return false }
    setEmailError('')
    return true
  }

  const users: OrgUser[] = (data?.data ?? []) as OrgUser[]

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    if (!validateEmail(form.email)) return
    try {
      const res = await invite.mutateAsync(form)
      setInviteSuccess(`User ${res.data.email} created. Temporary password: ${form.password}`)
      setForm({ full_name: '', email: '', password: '', role: 'pricing_analyst' })
      setEmailError('')
      setShowInvite(false)
    } catch {
      setInviteError('Failed to create user. Email may already exist.')
    }
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
          onClick={() => { setShowInvite(true); setInviteSuccess('') }}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      {inviteSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {inviteSuccess}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="glass-card rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold">New user</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <input
                required
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                required
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
              <label className="text-xs font-medium text-muted-foreground">Temporary password</label>
              <input
                type="text"
                required
                minLength={8}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
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
                disabled={invite.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {invite.isPending ? 'Creating…' : 'Create user'}
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
