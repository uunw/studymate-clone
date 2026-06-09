// Client shim mimicking @tanstack/react-start's createServerFn call shape, so the
// existing server/*.ts call sites stay unchanged during the Firestore migration.
// There is no server anymore: the (stubbed) handlers run in the browser and
// currently return empty data — TODO(phase 4): real Firestore queries.

type Opts = { method?: 'GET' | 'POST' }

class Builder {
	inputValidator(_v: unknown): this {
		return this
	}
	handler<O>(
		fn: (ctx: { data: unknown }) => Promise<O>,
	): (opts?: { data?: unknown }) => Promise<O> {
		return (opts?: { data?: unknown }) => fn({ data: opts?.data })
	}
}

export function createServerFn(_opts?: Opts): Builder {
	return new Builder()
}
