import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui utility — merges Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates an email address on the frontend before submission.
 * Matches what Pydantic's EmailStr accepts on the backend:
 *   - local part: letters, digits, . _ % + -
 *   - @ symbol (exactly one)
 *   - domain: letters, digits, . -
 *   - TLD: at least 2 letters
 * Examples rejected: "user@", "user@b", "@domain.com", "no-at-sign", "user @domain.com"
 */
export function isValidEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value.trim())
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/** Normalize backend datetime strings — append Z if no timezone suffix so JS treats as UTC */
function toUtcDate(iso: string): Date {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(normalized)
}

export function formatDate(iso: string): string {
  return toUtcDate(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return toUtcDate(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
