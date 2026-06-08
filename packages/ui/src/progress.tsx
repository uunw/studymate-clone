import { cn } from './cn'

const TONES = {
	brand: 'bg-brand-500',
	green: 'bg-green-500',
	amber: 'bg-amber-400',
}

/**
 * Horizontal progress bar. `percent` is the primary (filled) portion; the
 * optional `secondaryPercent` draws a second segment right after it (e.g. a
 * "planned / projected" overlay), clamped so the two never exceed 100%.
 */
export function ProgressBar({
	percent,
	secondaryPercent = 0,
	tone = 'brand',
	secondaryTone = 'amber',
	className,
}: {
	percent: number
	secondaryPercent?: number
	tone?: keyof typeof TONES
	secondaryTone?: keyof typeof TONES
	className?: string
}) {
	const pct = Math.max(0, Math.min(100, percent))
	const sec = Math.max(0, Math.min(100 - pct, secondaryPercent))
	return (
		<div className={cn('flex h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
			<div
				className={cn('h-full transition-all motion-reduce:transition-none', TONES[tone])}
				style={{ width: `${pct}%` }}
			/>
			{sec > 0 && (
				<div
					className={cn(
						'h-full transition-all motion-reduce:transition-none',
						TONES[secondaryTone],
					)}
					style={{ width: `${sec}%` }}
				/>
			)}
		</div>
	)
}
