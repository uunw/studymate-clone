import type {
	InputHTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from 'react'
import { cn } from './cn'

const fieldBase =
	'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-200'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cn(fieldBase, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea className={cn(fieldBase, 'min-h-24 resize-y', className)} {...props} />
}

// Standardized select. Sizes to content for inline filters; pass `w-full` for
// form fields. h-11 keeps it a 44px touch target. Always give it a <label> or
// an aria-label so its purpose is announced.
const selectBase =
	'h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select className={cn(selectBase, className)} {...props} />
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label className={cn('mb-1 block text-sm font-medium text-slate-700', className)} {...props} />
	)
}

export function Field({
	label,
	error,
	htmlFor,
	hint,
	children,
}: {
	label?: string
	error?: string
	htmlFor?: string
	hint?: string
	children: ReactNode
}) {
	return (
		<div className="space-y-1">
			{label && <Label htmlFor={htmlFor}>{label}</Label>}
			{children}
			{hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	)
}
