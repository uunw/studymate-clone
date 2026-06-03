import { type ErrorComponentProps, Link } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
			<h1 className="font-semibold text-xl">เกิดข้อผิดพลาด</h1>
			<p className="text-slate-500 text-sm">{error.message}</p>
			<Link to="/" className="text-brand-600 text-sm hover:underline">
				← กลับหน้าแรก
			</Link>
		</div>
	)
}
