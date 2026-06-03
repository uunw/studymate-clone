import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Spinner({ className }: { className?: string }) {
	return (
		<span
			role="status"
			aria-label="loading"
			className={cn(
				'inline-block size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent',
				className,
			)}
		/>
	)
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} {...props} />
}

type AlertTone = 'info' | 'success' | 'error'
const ALERT_TONES: Record<AlertTone, string> = {
	info: 'bg-brand-50 text-brand-800 border-brand-200',
	success: 'bg-green-50 text-green-800 border-green-200',
	error: 'bg-red-50 text-red-800 border-red-200',
}

export function Alert({
	tone = 'info',
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
	return (
		<div
			role={tone === 'error' ? 'alert' : 'status'}
			className={cn('rounded-lg border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
			{...props}
		/>
	)
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
	return (
		<div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 border-dashed py-12 text-center">
			<p className="font-medium text-slate-700">{title}</p>
			{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
		</div>
	)
}
