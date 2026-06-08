import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/my-subjects/')({
	beforeLoad: () => {
		throw redirect({ to: '/my-subjects/transcript' })
	},
})
