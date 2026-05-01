// SPDX-License-Identifier: Apache-2.0
/**
 * Runtime kernel for upact.
 *
 * The spec (SPEC.md §7.4) requires `Session` values to be opaque to the
 * application — applications MUST NOT decompose, decode, or extract claims
 * from a Session. The TypeScript `Session` type alone enforces compile-time
 * opacity (it is a branded interface that cannot be constructed in
 * application code), but runtime opacity requires care: a naive wrapper
 * class with a `held` field exposes the substrate value through
 * `JSON.stringify`, `Object.keys`, `Reflect.ownKeys`, `structuredClone`,
 * and other property-access vectors.
 *
 * `createSession` is the canonical factory: every conforming adapter
 * SHOULD use it to wrap substrate session values. The returned object is
 * frozen, has no enumerable substrate-shaped properties, returns
 * `'[upact:session]'` from `toJSON`, and stores the substrate value in a
 * module-private WeakMap keyed by the marker object.
 *
 * `_unwrapSession` is the controlled escape hatch — adapters that need to
 * recover the substrate value (for example, to pass it back to the
 * substrate's logout API in `invalidate`) import it from
 * `@prefig/upact/internal`. The `/internal` import path is the contract
 * signal that this code is crossing the opacity boundary the spec is
 * trying to maintain. Application code MUST NOT import from
 * `@prefig/upact/internal`.
 *
 * See SPEC.md §7.4 for the normative rule and `docs/adapter-shapes.md`
 * for the cross-substrate context.
 */

import type { Session } from './types.js';

const SESSIONS = new WeakMap<object, unknown>();

/**
 * Wrap a substrate session value into an upact-typed opaque Session.
 *
 * Adapter authors call this once per successful `authenticate` call;
 * the returned `Session` satisfies §7.4 by construction.
 */
export function createSession<T>(substrateValue: T): Session {
	const marker = Object.create(null) as object;
	Object.defineProperty(marker, 'toJSON', {
		value: () => '[upact:session]',
		enumerable: false,
		writable: false,
		configurable: false,
	});
	SESSIONS.set(marker, substrateValue);
	Object.freeze(marker);
	return marker as unknown as Session;
}

/**
 * Recover the substrate value from a Session created by `createSession`
 * in this same process. Returns `undefined` for values not produced by
 * this factory (including sessions produced before a process restart,
 * since the WeakMap is process-local).
 *
 * Adapter-internal — applications MUST NOT import this.
 */
export function _unwrapSession<T>(session: Session): T | undefined {
	return SESSIONS.get(session as unknown as object) as T | undefined;
}
