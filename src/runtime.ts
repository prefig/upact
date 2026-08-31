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
 * `createSessionBox` is the canonical mechanism: an adapter calls it once
 * in its factory and holds the returned box in closure scope. `seal` wraps
 * a substrate value into an opaque Session; `unseal` recovers it — but only
 * for sessions this box sealed. The sealed value lives in the box's private
 * WeakMap, so a session is meaningful only to the adapter instance that
 * created it: another adapter, another instance of the same adapter, a
 * structuredClone, or anything an application fabricates all unseal to
 * `undefined`.
 *
 * The factory is exported from `@prefig/upact/internal` only. Importing
 * that path is the contract signal that the caller is adapter code; the
 * factory itself grants nothing — a fresh box can unseal no existing
 * session. Application code MUST NOT import from `@prefig/upact/internal`.
 *
 * See SPEC.md §7.4 for the normative rule and `docs/adapter-shapes.md`
 * for the cross-substrate context.
 */

import type { Session } from './types.js';

/**
 * The seal/unseal capability pair for one adapter instance.
 *
 * `unseal` is total: it returns the exact reference `seal` stored for a
 * session from this box, and `undefined` for every other input — a foreign
 * session, a clone, a fabricated object, `null`, a primitive. It never
 * throws. Because `seal(undefined)` is rejected, `unseal(x) === undefined`
 * means exactly "not sealed by this box".
 */
export interface SessionBox<T> {
	seal(substrateValue: T): Session;
	unseal(session: Session): T | undefined;
}

/**
 * Create a session box. Call once per adapter instance, inside the adapter
 * factory; keep both halves in closure scope and never export or store
 * `unseal` where application code can reach it.
 */
export function createSessionBox<T>(): SessionBox<T> {
	const sealed = new WeakMap<object, T>();

	function seal(substrateValue: T): Session {
		if (substrateValue === undefined) {
			throw new TypeError(
				'createSessionBox: seal(undefined) is not allowed — unseal() reserves undefined for "not sealed by this box"',
			);
		}
		const marker = Object.create(null) as object;
		Object.defineProperty(marker, 'toJSON', {
			value: () => '[upact:session]',
			enumerable: false,
			writable: false,
			configurable: false,
		});
		sealed.set(marker, substrateValue);
		Object.freeze(marker);
		return marker as unknown as Session;
	}

	function unseal(session: Session): T | undefined {
		const key = session as unknown;
		if (typeof key !== 'object' || key === null) return undefined;
		return sealed.get(key);
	}

	return { seal, unseal };
}
