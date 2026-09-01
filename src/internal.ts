// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter-internal entry point.
 *
 * Importing from `@prefig/upact/internal` is a contract signal that the
 * caller is adapter code. Conforming adapter packages obtain every Session
 * they return from `createOpaqueSession()` and keep any session-to-state
 * association in a closure-held `WeakMap<Session, T>` that never leaves
 * the adapter factory. Application packages MUST NOT import from this
 * path — the constructor alone grants nothing (it returns an empty marker
 * with no associated state), but the import is the greppable boundary
 * marker.
 *
 * See SPEC.md §7.4 and §7.5.
 */

export { createOpaqueSession } from './runtime.js';
