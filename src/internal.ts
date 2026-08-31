// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter-internal entry point.
 *
 * Importing from `@prefig/upact/internal` is a contract signal that the
 * caller is adapter code. Conforming adapter packages call
 * `createSessionBox()` once in their factory and keep the returned box in
 * closure scope; the `unseal` half is the capability the spec's opacity
 * guarantee protects, and it must never leave that closure. Application
 * packages MUST NOT import from this path — the factory alone grants
 * nothing (a fresh box can unseal no existing session), but the import is
 * the greppable boundary marker.
 *
 * See SPEC.md §7.4 and §7.5.
 */

export { createSessionBox } from './runtime.js';
export type { SessionBox } from './runtime.js';
