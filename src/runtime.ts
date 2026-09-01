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
 * `createOpaqueSession` is the canonical mechanism: it constructs the
 * hardened opaque marker and stores nothing. The value-to-session
 * association is each adapter's own business — an adapter that needs to
 * recover state holds its own `WeakMap<Session, T>` in factory closure,
 * sets it where the session is minted, and reads it at recovery sites.
 * `WeakMap.get` returns `undefined` for a foreign session, a clone, or
 * anything an application fabricates, so a session is meaningful only to
 * the adapter instance that created it. Adapters that never recover state
 * (state lives in a cookie or a request-derived client) call the
 * constructor and keep no map at all.
 *
 * The constructor is exported from `@prefig/upact/internal` only. Importing
 * that path is the contract signal that the caller is adapter code; the
 * constructor itself grants nothing — it returns an empty marker with no
 * associated state. Application code MUST NOT import from
 * `@prefig/upact/internal`.
 *
 * See SPEC.md §7.4 for the normative rule and `docs/adapter-shapes.md`
 * for the cross-substrate context.
 */

import type { Session } from './types.js';

/**
 * Construct an opaque Session marker: a frozen, null-prototype object whose
 * only own property is a non-enumerable `toJSON` returning
 * `'[upact:session]'`. Every call returns a distinct object. The marker
 * carries no state; an adapter that needs to recover substrate state keys
 * a closure-held WeakMap on it and treats a missing entry as "not this
 * instance's session".
 */
export function createOpaqueSession(): Session {
	const marker = Object.create(null) as object;
	Object.defineProperty(marker, 'toJSON', {
		value: () => '[upact:session]',
		enumerable: false,
		writable: false,
		configurable: false,
	});
	Object.freeze(marker);
	return marker as unknown as Session;
}
