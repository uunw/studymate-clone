export type Paginated<T> = {
	items: T[]
	page: number
	pageSize: number
	total: number
	totalPages: number
}

export function paginate<T>(all: readonly T[], page: number, pageSize: number): Paginated<T> {
	const total = all.length
	const totalPages = Math.max(1, Math.ceil(total / pageSize))
	const safePage = Math.min(Math.max(1, page), totalPages)
	const start = (safePage - 1) * pageSize
	return {
		items: all.slice(start, start + pageSize) as T[],
		page: safePage,
		pageSize,
		total,
		totalPages,
	}
}

/** SQL LIMIT/OFFSET pair for a page. */
export function pageBounds(page: number, pageSize: number): { limit: number; offset: number } {
	return { limit: pageSize, offset: (Math.max(1, page) - 1) * pageSize }
}
