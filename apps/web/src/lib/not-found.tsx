import { Link } from '@tanstack/react-router'

export function NotFound() {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
			<p className="font-bold text-6xl text-brand-600">404</p>
			<h1 className="font-semibold text-xl">ไม่พบหน้าที่คุณค้นหา</h1>
			<Link to="/" className="text-brand-600 text-sm hover:underline">
				← กลับหน้าแรก
			</Link>
		</div>
	)
}
