// SPDX-License-Identifier: Apache-2.0
/**
 * Public entry point for `@prefig/upact`.
 *
 * Re-exports all spec types from `./types.js` and the `createSession`
 * factory from `./runtime.js`. Application code imports from this entry.
 * Adapter-internal helpers (currently `_unwrapSession`) are exported from
 * `./internal.js` and reachable only via the `@prefig/upact/internal`
 * subpath — see SPEC.md §7.4 and `docs/adapter-shapes.md`.
 */

export type {
	Capability,
	IdentityLifecycle,
	Upactor,
	UserIdentity, // deprecated alias for v0.1.x compat; removed in v0.2
	Session,
	AuthError,
	AuthErrorCode,
	IdentityPort,
} from './types.js';

export { createSession } from './runtime.js';
export { SubstrateUnavailableError } from './errors.js';
