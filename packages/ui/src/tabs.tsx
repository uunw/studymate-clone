import { cn } from './cn'

export type Tab = { value: string; label: string }

/** Minimal controlled tab strip. */
export function Tabs({
	tabs,
	value,
	onChange,
	className,
}: {
	tabs: readonly Tab[]
	value: string
	onChange: (value: string) => void
	className?: string
}) {
	return (
		<div className={cn('flex gap-1 border-slate-200 border-b', className)} role="tablist">
			{tabs.map((t) => {
				const active = t.value === value
				return (
					<button
						key={t.value}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(t.value)}
						className={cn(
							'-mb-px border-b-2 px-4 py-2.5 font-medium text-sm transition-colors',
							active
								? 'border-brand-600 text-brand-700'
								: 'border-transparent text-slate-500 hover:text-slate-800',
						)}
					>
						{t.label}
					</button>
				)
			})}
		</div>
	)
}
