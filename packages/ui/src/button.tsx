import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
	primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
	secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:outline-brand-300',
	ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
	danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
}
// md is the default and sized to a 44px touch target (mobile-first); sm stays
// compact for dense desktop contexts.
const SIZES: Record<Size, string> = {
	sm: 'h-9 px-3.5 text-sm',
	md: 'h-11 px-4 text-sm',
	lg: 'h-12 px-6 text-base',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant
	size?: Size
	loading?: boolean
}

export function Button({
	variant = 'primary',
	size = 'md',
	loading = false,
	disabled,
	className,
	children,
	...props
}: ButtonProps) {
	return (
		<button
			type="button"
			disabled={disabled || loading}
			className={cn(
				'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
				'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				VARIANTS[variant],
				SIZES[size],
				className,
			)}
			{...props}
		>
			{loading && (
				<span
					aria-hidden
					className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				/>
			)}
			{children}
		</button>
	)
}
