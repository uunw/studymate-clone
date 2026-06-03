import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-sm',
				className,
			)}
			{...props}
		/>
	)
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('p-5', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('border-slate-100 border-b px-5 py-4', className)} {...props} />
}

type BadgeTone = 'brand' | 'green' | 'red' | 'amber' | 'slate'
const TONES: Record<BadgeTone, string> = {
	brand: 'bg-brand-50 text-brand-700',
	green: 'bg-green-50 text-green-700',
	red: 'bg-red-50 text-red-700',
	amber: 'bg-amber-50 text-amber-700',
	slate: 'bg-slate-100 text-slate-600',
}

export function Badge({
	tone = 'slate',
	className,
	...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs',
				TONES[tone],
				className,
			)}
			{...props}
		/>
	)
}
