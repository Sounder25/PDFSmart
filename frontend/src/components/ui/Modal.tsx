import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl',
          'w-full p-6 animate-slide-in max-h-[90vh] overflow-y-auto',
          sizes[size]
        )}>
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <Dialog.Title className="text-base font-semibold text-slate-100">{title}</Dialog.Title>}
              {description && <Dialog.Description className="text-xs text-slate-400 mt-1">{description}</Dialog.Description>}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors ml-4 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger = false
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; description?: string; confirmLabel?: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex gap-3 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
