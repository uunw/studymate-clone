import { cn } from './cn'

/** Accessible on/off switch. Wraps a native checkbox (role="switch") so it keeps
 *  keyboard + form semantics; the visual track/thumb is the styled sibling. */
export function Switch({
	checked,
	onChange,
	disabled,
	label,
	className,
}: {
	checked: boolean
	onChange: (checked: boolean) => void
	disabled?: boolean
	label?: string
	className?: string
}) {
	return (
		<label
			className={cn(
				'relative inline-flex shrink-0 items-center',
				disabled ? 'cursor-not-allowed' : 'cursor-pointer',
				className,
			)}
		>
			<input
				type="checkbox"
				role="switch"
				aria-checked={checked}
				className="peer sr-only"
				checked={checked}
				disabled={disabled}
				aria-label={label}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span className="relative h-5 w-9 rounded-full bg-slate-300 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 peer-disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none" />
		</label>
	)
}
