import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react'
import { configService } from '@/services/configService'
import type { AIProvider, AIVerifyResult } from '@/types/config'

// ── Provider registry (mirrors backend PROVIDERS dict) ───────────────────────

const PROVIDERS: { value: AIProvider; label: string; defaultModel: string; hint: string }[] = [
  {
    value: 'cerebras',
    label: 'Cerebras',
    defaultModel: 'llama3.1-8b',
    hint: 'Free tier — fastest inference (~500 tok/s)',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    hint: 'Free tier via Google AI Studio',
  },
  {
    value: 'groq',
    label: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    hint: 'Free tier — OpenAI-compatible',
  },
]

function getDefaultModel(provider: AIProvider | '') {
  return PROVIDERS.find((p) => p.value === provider)?.defaultModel ?? ''
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIConfigForm() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['config-ai'],
    queryFn: () => configService.getAI(),
  })

  const stored = data?.data

  // Local form state — undefined means "not edited yet, use stored value"
  const [provider, setProvider] = useState<AIProvider | ''>('')
  const [model, setModel]       = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [showKey, setShowKey]   = useState(false)

  const [verifyResult, setVerifyResult] = useState<AIVerifyResult | null>(null)
  const [verifying, setVerifying]       = useState(false)

  const saveMutation = useMutation({
    mutationFn: () =>
      configService.updateAI({
        ai_provider: provider || stored?.ai_provider || undefined,
        ai_model:    model    || stored?.ai_model    || undefined,
        // Only send key when the user has typed something
        ai_api_key: apiKey.trim() ? apiKey.trim() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-ai'] })
      setApiKey('')
      setVerifyResult(null)
    },
  })

  // ── Derive display values ──────────────────────────────────────────────────

  const displayProvider = provider || stored?.ai_provider || ''
  const displayModel    = model    || stored?.ai_model    || ''

  // ── Verify ────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await configService.verifyAI({
        ai_provider: (provider || stored?.ai_provider) as AIProvider | undefined,
        ai_model:    model    || stored?.ai_model    || undefined,
        // Pass the key only if user typed a new one; backend falls back to stored key
        ai_api_key: apiKey.trim() ? apiKey.trim() : undefined,
      })
      setVerifyResult(res.data)
    } catch {
      setVerifyResult({ ok: false, message: 'Request failed — check the console.', latency_ms: null })
    } finally {
      setVerifying(false)
    }
  }

  // ── Dirty check ───────────────────────────────────────────────────────────

  const isDirty =
    (provider && provider !== stored?.ai_provider) ||
    (model    && model    !== stored?.ai_model)    ||
    apiKey.trim().length > 0

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading AI configuration…</p>
  }

  return (
    <div className="glass-card rounded-lg p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold">AI Provider</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure which AI model powers the pricing pipeline for this organisation.
          Settings saved here take precedence over server environment variables.
        </p>
      </div>

      {/* Current status badge */}
      {stored?.ai_key_set ? (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Active: <strong>{stored.ai_provider}</strong> / <strong>{stored.ai_model}</strong>
            {stored.ai_key_preview && (
              <> — key: <code className="font-mono">{stored.ai_key_preview}</code></>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          No AI key configured in the database — using server environment variables as fallback.
        </div>
      )}

      {/* Provider */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Provider</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          value={displayProvider}
          onChange={(e) => {
            const p = e.target.value as AIProvider
            setProvider(p)
            // Pre-fill model with provider default if user hasn't touched it yet
            if (!model) setModel(getDefaultModel(p))
            setVerifyResult(null)
          }}
        >
          <option value="">— select provider —</option>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} — {p.hint}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Model name</label>
        <input
          type="text"
          placeholder={
            displayProvider ? getDefaultModel(displayProvider as AIProvider) : 'e.g. llama3.1-8b'
          }
          className="w-full rounded-md border px-3 py-2 text-sm bg-background font-mono"
          value={displayModel}
          onChange={(e) => { setModel(e.target.value); setVerifyResult(null) }}
        />
        {displayProvider && (
          <p className="text-xs text-muted-foreground">
            Default for {PROVIDERS.find((p) => p.value === displayProvider)?.label}:{' '}
            <button
              type="button"
              className="underline"
              onClick={() => setModel(getDefaultModel(displayProvider as AIProvider))}
            >
              {getDefaultModel(displayProvider as AIProvider)}
            </button>
          </p>
        )}
      </div>

      {/* API key */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          API key
          {stored?.ai_key_set && (
            <span className="ml-1 text-muted-foreground font-normal">
              (leave blank to keep existing key)
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={stored?.ai_key_set ? stored.ai_key_preview ?? '••••••••' : 'Paste your API key'}
            className="w-full rounded-md border px-3 py-2 pr-10 text-sm bg-background font-mono"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setVerifyResult(null) }}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Verify result */}
      {verifyResult && (
        <div
          className={`flex items-start gap-2 rounded px-3 py-2 text-xs border ${
            verifyResult.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {verifyResult.ok
            ? <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            : <XCircle    className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          <span>{verifyResult.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {verifying && <Loader className="h-3.5 w-3.5 animate-spin" />}
          {verifying ? 'Testing…' : 'Test Connection'}
        </button>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="px-5 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>

        {isDirty && (
          <button
            type="button"
            onClick={() => { setProvider(''); setModel(''); setApiKey(''); setVerifyResult(null) }}
            className="px-4 py-2 text-sm text-muted-foreground"
          >
            Discard
          </button>
        )}
      </div>

      {saveMutation.isSuccess && !isDirty && (
        <p className="text-xs text-green-700">AI configuration saved.</p>
      )}
      {saveMutation.isError && (
        <p className="text-xs text-destructive">Save failed — check the server logs.</p>
      )}
    </div>
  )
}
