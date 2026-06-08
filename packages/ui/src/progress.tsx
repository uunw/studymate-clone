import { cn } from './cn'

/** A horizontal progress bar. `percent` is clamped to 0–100. */
export function ProgressBar({
	percent,
	tone = 'brand',
	className,
}: {
	percent: number
	tone?: 'brand' | 'green'
	className?: string
}) {
	const pct = Math.max(0, Math.min(100, percent))
	return (
		<div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
			<div
				className={cn(
					'h-full rounded-full transition-all',
					tone === 'green' ? 'bg-green-500' : 'bg-brand-500',
				)}
				style={{ width: `${pct}%` }}
			/>
		</div>
	)
}
