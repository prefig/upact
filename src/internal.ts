// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter-internal entry point.
 *
 * Importing from `@prefig/upact/internal` is a contract signal that the
 * caller is crossing the opacity boundary `Session` is meant to enforce.
 * Conforming adapter packages MAY import from this path to recover
 * substrate values for substrate-side operations (e.g. `signOut`,
 * `unloadProfile`). Application packages MUST NOT.
 *
 * See SPEC.md §7.4.
 */

export { _unwrapSession } from './runtime.js';
