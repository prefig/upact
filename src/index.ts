// SPDX-License-Identifier: Apache-2.0
/**
 * Public entry point for `@prefig/upact`.
 *
 * Re-exports all spec types from `./types.js`. Application code imports
 * from this entry. The adapter-internal session box factory
 * (`createSessionBox`) is exported from `./internal.js` and reachable only
 * via the `@prefig/upact/internal` subpath — see SPEC.md §7.4 and
 * `docs/adapter-shapes.md`.
 */

export type {
	Capability,
	IdentityLifecycle,
	Upactor,
	PresentationRequest,
	Presentation,
	Session,
	AuthError,
	AuthErrorCode,
	IdentityPort,
} from './types.js';

export { SubstrateUnavailableError } from './errors.js';
