import { useId, useState } from 'react'
import { cn } from './cn'

function Star({ fill, className }: { fill: number; className?: string }) {
	// fill: 0..1 fraction of the star to paint. useId keeps the gradient id stable
	// across SSR and client render (Math.random would cause a hydration mismatch).
	const id = useId()
	return (
		<svg viewBox="0 0 20 20" className={cn('size-5', className)} aria-hidden>
			<defs>
				<linearGradient id={id}>
					<stop offset={`${fill * 100}%`} stopColor="currentColor" />
					<stop offset={`${fill * 100}%`} stopColor="transparent" />
				</linearGradient>
			</defs>
			<path
				fill={`url(#${id})`}
				stroke="currentColor"
				strokeWidth="1"
				d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78L1.58 7.62l5.82-.85L10 1.5z"
			/>
		</svg>
	)
}

/** Read-only star rating (supports halves). */
export function RatingStars({ value, className }: { value: number; className?: string }) {
	return (
		<div className={cn('flex text-accent-500', className)} aria-label={`${value} จาก 5`}>
			{[0, 1, 2, 3, 4].map((i) => (
				<Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
			))}
		</div>
	)
}

/** Interactive 1..5 star input. */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	const [hover, setHover] = useState<number | null>(null)
	const shown = hover ?? value
	return (
		<div className="flex text-accent-500" onMouseLeave={() => setHover(null)}>
			{[1, 2, 3, 4, 5].map((i) => (
				<button
					key={i}
					type="button"
					aria-label={`${i} ดาว`}
					className="flex size-11 items-center justify-center"
					onMouseEnter={() => setHover(i)}
					onClick={() => onChange(i)}
				>
					<Star fill={shown >= i ? 1 : 0} className="size-7" />
				</button>
			))}
		</div>
	)
}
