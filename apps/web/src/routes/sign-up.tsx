import { createFileRoute, redirect } from '@tanstack/react-router'

// Firebase Google auth has no separate sign-up — send to /sign-in.
export const Route = createFileRoute('/sign-up')({
	beforeLoad: () => {
		throw redirect({ to: '/sign-in' })
	},
	component: () => null,
})
