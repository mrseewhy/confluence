import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui'

interface BillingComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional tier the user clicked, shown for context. */
  tier?: string
}

/**
 * Every billing/plan control opens this. The app is free for everyone right
 * now, so we say so plainly instead of showing a fake paywall.
 */
export function BillingComingSoonModal({ isOpen, onClose, tier }: BillingComingSoonModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Everything is free" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Confluence is completely free while we are in early access. Every feature —
          notes, folders, sharing, collaboration, comments, and export
          {tier ? ` — including the ${tier} plan` : ''}
          {' '}is available at no cost and with no limits.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Paid plans and billing are coming soon. When they arrive, everything you
          have created stays yours, and nothing you use today will change.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-2)',
          }}
        >
          <Button variant="primary" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  )
}
