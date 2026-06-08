import { type ReactNode, useEffect, useId, useRef } from 'react'
import { cn } from './cn'

const FOCUSABLE =
	'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Centered modal over a dimmed backdrop. When `dismissable`, clicking the
 *  backdrop or pressing Escape calls `onClose`; otherwise the modal must be
 *  resolved by an action. Focus is moved into the dialog on open, trapped while
 *  open, and restored to the trigger on close; background scroll is locked. */
export function Modal({
	open,
	onClose,
	title,
	children,
	dismissable = true,
	className,
}: {
	open: boolean
	onClose?: () => void
	title?: ReactNode
	children: ReactNode
	dismissable?: boolean
	className?: string
}) {
	const dialogRef = useRef<HTMLDivElement>(null)
	const titleId = useId()

	// Focus management + scroll lock — runs only on open/close transitions so an
	// inline onClose prop can't re-steal focus on every re-render.
	useEffect(() => {
		if (!open) return
		const dialog = dialogRef.current
		const previouslyFocused = document.activeElement as HTMLElement | null
		const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
		;(first ?? dialog)?.focus()

		const prevOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = prevOverflow
			previouslyFocused?.focus?.()
		}
	}, [open])

	// Escape-to-close + Tab focus trap. Rebinds when the handlers change.
	useEffect(() => {
		if (!open) return
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape' && dismissable) {
				onClose?.()
				return
			}
			const dialog = dialogRef.current
			if (e.key !== 'Tab' || !dialog) return
			const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
			if (items.length === 0) {
				e.preventDefault()
				return
			}
			const edge = e.shiftKey ? items[0] : items[items.length - 1]
			if (document.activeElement === edge) {
				e.preventDefault()
				;(e.shiftKey ? items[items.length - 1] : items[0])?.focus()
			}
		}
		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [open, dismissable, onClose])

	if (!open) return null
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="ปิด"
				tabIndex={-1}
				className="absolute inset-0 bg-slate-900/40"
				onClick={() => dismissable && onClose?.()}
			/>
			<div
				ref={dialogRef}
				className={cn(
					'relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-xl',
					className,
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? titleId : undefined}
				tabIndex={-1}
			>
				{title && (
					<div
						id={titleId}
						className="border-slate-100 border-b px-5 py-4 font-semibold text-slate-900"
					>
						{title}
					</div>
				)}
				<div className="p-5">{children}</div>
			</div>
		</div>
	)
}
