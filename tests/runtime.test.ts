// SPDX-License-Identifier: Apache-2.0
/**
 * Runtime opacity tests for `createOpaqueSession`.
 *
 * These tests verify SPEC.md §7.4 holds at runtime: a Session value is an
 * empty, frozen, null-prototype marker that cannot be decomposed by any
 * common inspection vector — JSON.stringify, Object.keys,
 * Object.getOwnPropertyNames, Reflect.ownKeys, structuredClone,
 * util.inspect, console.log, or direct property access. The constructor
 * stores nothing; an adapter that recovers substrate state keys its own
 * closure-held WeakMap on the marker, and the WeakMap tests below document
 * that pattern (a foreign session reads as `undefined`).
 * `createOpaqueSession` is reachable only via `@prefig/upact/internal`,
 * which is the contract signal that the caller is adapter code.
 */

import { describe, it, expect } from 'vitest';
import util from 'node:util';
import { createOpaqueSession } from '../src/internal.js';
import type { Session } from '../src/types.js';

interface Substrate {
	access_token: string;
	refresh_token: string;
	user: { id: string; email: string };
}

function fixture(): Substrate {
	return {
		access_token: 'eyJexampleJWT.body.signature',
		refresh_token: 'rt_secret_value',
		user: { id: 'u-1', email: 'alice@example.com' },
	};
}

describe('createOpaqueSession — JSON.stringify opacity', () => {
	it('serialises to the opaque token literal', () => {
		const session = createOpaqueSession();
		expect(JSON.stringify(session)).toBe('"[upact:session]"');
	});

	it('does not leak adapter-associated values via JSON.stringify', () => {
		const sessions = new WeakMap<Session, Substrate>();
		const session = createOpaqueSession();
		sessions.set(session, fixture());
		const json = JSON.stringify(session);
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
		expect(json).not.toContain('alice@example.com');
		expect(json).not.toContain('u-1');
	});

	it('does not leak adapter-associated values when nested in a larger object', () => {
		const sessions = new WeakMap<Session, Substrate>();
		const session = createOpaqueSession();
		sessions.set(session, fixture());
		const wrapper = { kind: 'session-holder', session };
		const json = JSON.stringify(wrapper);
		expect(json).toContain('session-holder');
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
	});
});

describe('createOpaqueSession — property enumeration opacity', () => {
	it('Object.keys returns no fields', () => {
		expect(Object.keys(createOpaqueSession())).toEqual([]);
	});

	it('Object.getOwnPropertyNames returns only toJSON', () => {
		expect(Object.getOwnPropertyNames(createOpaqueSession())).toEqual(['toJSON']);
	});

	it('Reflect.ownKeys returns only toJSON', () => {
		expect(Reflect.ownKeys(createOpaqueSession())).toEqual(['toJSON']);
	});

	it('Object.getOwnPropertySymbols returns nothing', () => {
		expect(Object.getOwnPropertySymbols(createOpaqueSession())).toEqual([]);
	});

	it('for-in iteration yields nothing', () => {
		const session = createOpaqueSession();
		const keys: string[] = [];
		for (const key in session) keys.push(key);
		expect(keys).toEqual([]);
	});
});

describe('createOpaqueSession — direct property access opacity', () => {
	it('property reads return undefined', () => {
		const session = createOpaqueSession() as unknown as Record<string, unknown>;
		expect(session['access_token']).toBeUndefined();
		expect(session['refresh_token']).toBeUndefined();
		expect(session['user']).toBeUndefined();
	});
});

describe('createOpaqueSession — structural cloning and inspection opacity', () => {
	it('structuredClone does not preserve an adapter-held association', () => {
		const sessions = new WeakMap<Session, Substrate>();
		const session = createOpaqueSession();
		sessions.set(session, fixture());
		const cloned = structuredClone(session) as unknown;
		expect(sessions.get(cloned as never)).toBeUndefined();
	});

	it('util.inspect does not leak adapter-associated values', () => {
		const sessions = new WeakMap<Session, Substrate>();
		const session = createOpaqueSession();
		sessions.set(session, fixture());
		const inspected = util.inspect(session, { depth: null, showHidden: true });
		expect(inspected).not.toContain('eyJexampleJWT');
		expect(inspected).not.toContain('rt_secret_value');
		expect(inspected).not.toContain('alice@example.com');
	});
});

describe('createOpaqueSession — runtime immutability and shape', () => {
	it('the returned object is frozen', () => {
		expect(Object.isFrozen(createOpaqueSession())).toBe(true);
	});

	it('the returned object has a null prototype', () => {
		expect(Object.getPrototypeOf(createOpaqueSession())).toBeNull();
	});

	it('attempts to mutate fail silently or throw', () => {
		'use strict';
		const session = createOpaqueSession() as unknown as Record<string, unknown>;
		// Frozen objects in strict mode throw on assignment; non-strict silently fails.
		// Either way, nothing can be attached to the marker.
		try {
			session['access_token'] = 'attacker-injected';
		} catch {
			// expected in strict mode
		}
		expect(session['access_token']).toBeUndefined();
	});
});

describe('createOpaqueSession — adapter-owned association', () => {
	it('two calls return distinct objects', () => {
		expect(createOpaqueSession()).not.toBe(createOpaqueSession());
	});

	it('works as a WeakMap key and returns the exact stored reference', () => {
		const sessions = new WeakMap<Session, Substrate>();
		const substrate = fixture();
		const session = createOpaqueSession();
		sessions.set(session, substrate);
		expect(sessions.get(session)).toBe(substrate); // reference equality — same WeakMap entry
	});

	it('a fresh WeakMap reads a foreign session as undefined', () => {
		// The adapter pattern: an instance's WeakMap holds only sessions that
		// instance created. A session from anywhere else — another instance,
		// another adapter, a clone, a fabrication — reads as undefined.
		const sessions = new WeakMap<Session, Substrate>();
		const foreign = createOpaqueSession();
		expect(sessions.get(foreign)).toBeUndefined();
	});
});
