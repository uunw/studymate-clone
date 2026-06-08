import type { ReactNode } from 'react'
import { cn } from './cn'

/** Centered modal over a dimmed backdrop. When `dismissable`, clicking the
 *  backdrop calls `onClose`; otherwise the modal must be resolved by an action. */
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
	if (!open) return null
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="ปิด"
				className="absolute inset-0 bg-slate-900/40"
				onClick={() => dismissable && onClose?.()}
			/>
			<div
				className={cn(
					'relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-xl',
					className,
				)}
				role="dialog"
				aria-modal="true"
			>
				{title && (
					<div className="border-slate-100 border-b px-5 py-4 font-semibold text-slate-900">
						{title}
					</div>
				)}
				<div className="p-5">{children}</div>
			</div>
		</div>
	)
}
