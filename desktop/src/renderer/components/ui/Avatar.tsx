import { useState, type ReactNode } from 'react'
import { cn } from './cn'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  name: string
  /** Optional image URL; falls back to initials if it fails to load. */
  src?: string | null
  size?: AvatarSize
  /** Status dot: online / away / busy / offline. */
  status?: 'online' | 'busy' | 'away' | 'offline'
  /** Draws a 2px ring in the surrounding surface colour (stacked avatars). */
  ring?: boolean
  className?: string
}

const SIZE: Record<AvatarSize, string> = {
  xs: 'size-6 text-nq-2xs',
  sm: 'size-8 text-nq-xs',
  md: 'size-10 text-nq-sm',
  lg: 'size-12 text-nq-base',
  xl: 'size-16 text-nq-xl',
}

const DOT_SIZE: Record<AvatarSize, string> = {
  xs: 'size-1.5',
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-3',
  xl: 'size-3.5',
}

/* Deterministic, token-only tones so two users rarely share a hue by accident
   and no component ever hardcodes a colour. */
const TONES = [
  'bg-nq-primary-soft text-nq-primary-soft-text',
  'bg-nq-accent-soft text-nq-accent-strong',
  'bg-nq-info-soft text-nq-info',
  'bg-nq-warning-soft text-nq-warning',
  'bg-nq-danger-soft text-nq-danger',
  'bg-nq-success-soft text-nq-success',
] as const

const STATUS = {
  online: 'bg-nq-success',
  busy: 'bg-nq-danger',
  away: 'bg-nq-warning',
  offline: 'bg-nq-text-tertiary',
} as const

const STATUS_LABEL = {
  online: 'Đang trực tuyến',
  busy: 'Đang bận',
  away: 'Tạm vắng',
  offline: 'Ngoại tuyến',
} as const

/** Two-letter initials, Vietnamese-aware: "Nguyễn Văn An" → "NA". */
export function deriveInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)).toUpperCase()
}

function toneFor(name: string): (typeof TONES)[number] {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 3601
  }
  return TONES[hash % TONES.length]!
}

/**
 * Identity chip. Initials are the primary rendering; a photo is an upgrade that
 * degrades back to initials without layout shift.
 */
export function Avatar({ name, src, size = 'md', status, ring = false, className }: AvatarProps): ReactNode {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-nq-full font-semibold select-none',
          SIZE[size],
          ring && 'ring-2 ring-nq-surface',
          !showImage && toneFor(name)
        )}
      >
        {showImage ? (
          <img
            src={src ?? undefined}
            alt=""
            onError={() => setFailed(true)}
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <span aria-hidden="true" className="tracking-[0.02em]">
            {deriveInitials(name)}
          </span>
        )}
        <span className="nq-sr-only">{name}</span>
      </span>
      {status ? (
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 rounded-nq-full ring-2 ring-nq-surface',
            DOT_SIZE[size],
            STATUS[status]
          )}
        >
          <span className="nq-sr-only">{STATUS_LABEL[status]}</span>
        </span>
      ) : null}
    </span>
  )
}
