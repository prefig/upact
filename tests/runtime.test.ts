// SPDX-License-Identifier: Apache-2.0
/**
 * Runtime opacity tests for `createSessionBox`.
 *
 * These tests verify SPEC.md §7.4 holds at runtime: a Session value
 * sealed by a box cannot be decomposed by any common inspection vector —
 * JSON.stringify, Object.keys, Object.getOwnPropertyNames, Reflect.ownKeys,
 * structuredClone, util.inspect, console.log, or direct property access —
 * and can be unsealed only by the box that sealed it. `createSessionBox`
 * is reachable only via `@prefig/upact/internal`, which is the contract
 * signal that the caller is adapter code.
 */

import { describe, it, expect } from 'vitest';
import util from 'node:util';
import { createSessionBox } from '../src/internal.js';

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

describe('seal — JSON.stringify opacity', () => {
	it('serialises to the opaque token literal', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		expect(JSON.stringify(session)).toBe('"[upact:session]"');
	});

	it('does not leak substrate values via JSON.stringify', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const json = JSON.stringify(session);
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
		expect(json).not.toContain('alice@example.com');
		expect(json).not.toContain('u-1');
	});

	it('does not leak substrate values when nested in a larger object', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const wrapper = { kind: 'session-holder', session };
		const json = JSON.stringify(wrapper);
		expect(json).toContain('session-holder');
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
	});
});

describe('seal — property enumeration opacity', () => {
	it('Object.keys returns no substrate fields', () => {
		const box = createSessionBox<Substrate>();
		expect(Object.keys(box.seal(fixture()))).toEqual([]);
	});

	it('Object.getOwnPropertyNames returns no substrate fields', () => {
		const box = createSessionBox<Substrate>();
		expect(Object.getOwnPropertyNames(box.seal(fixture()))).toEqual(['toJSON']);
	});

	it('Reflect.ownKeys returns no substrate fields', () => {
		const box = createSessionBox<Substrate>();
		expect(Reflect.ownKeys(box.seal(fixture()))).toEqual(['toJSON']);
	});

	it('Object.getOwnPropertySymbols returns no substrate fields', () => {
		const box = createSessionBox<Substrate>();
		expect(Object.getOwnPropertySymbols(box.seal(fixture()))).toEqual([]);
	});

	it('for-in iteration yields nothing', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const keys: string[] = [];
		for (const key in session) keys.push(key);
		expect(keys).toEqual([]);
	});
});

describe('seal — direct property access opacity', () => {
	it('property reads return undefined', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture()) as unknown as Record<string, unknown>;
		expect(session['access_token']).toBeUndefined();
		expect(session['refresh_token']).toBeUndefined();
		expect(session['user']).toBeUndefined();
	});
});

describe('seal — structural cloning and inspection opacity', () => {
	it('structuredClone does not preserve the substrate value', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const cloned = structuredClone(session) as unknown;
		expect(box.unseal(cloned as never)).toBeUndefined();
	});

	it('util.inspect does not leak substrate fields', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const inspected = util.inspect(session, { depth: null, showHidden: true });
		expect(inspected).not.toContain('eyJexampleJWT');
		expect(inspected).not.toContain('rt_secret_value');
		expect(inspected).not.toContain('alice@example.com');
	});
});

describe('seal — runtime immutability', () => {
	it('the returned object is frozen', () => {
		const box = createSessionBox<Substrate>();
		expect(Object.isFrozen(box.seal(fixture()))).toBe(true);
	});

	it('attempts to mutate fail silently or throw', () => {
		'use strict';
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture()) as unknown as Record<string, unknown>;
		// Frozen objects in strict mode throw on assignment; non-strict silently fails.
		// Either way, the substrate value is not exposed.
		try {
			session['access_token'] = 'attacker-injected';
		} catch {
			// expected in strict mode
		}
		expect(session['access_token']).toBeUndefined();
	});
});

describe('unseal — box-held capability', () => {
	it('returns the substrate value for a session this box sealed', () => {
		const box = createSessionBox<Substrate>();
		const substrate = fixture();
		const session = box.seal(substrate);
		const recovered = box.unseal(session);
		expect(recovered).toBe(substrate); // reference equality — same WeakMap entry
	});

	it('another box cannot unseal it', () => {
		const boxA = createSessionBox<Substrate>();
		const boxB = createSessionBox<Substrate>();
		const session = boxA.seal(fixture());
		expect(boxB.unseal(session)).toBeUndefined();
		expect(boxA.unseal(session)).not.toBeUndefined();
	});

	it('returns undefined for a non-session input', () => {
		const box = createSessionBox<Substrate>();
		const fake = { _opaque: Symbol() } as never;
		expect(box.unseal(fake)).toBeUndefined();
	});

	it('returns undefined for a structuredClone of a session', () => {
		const box = createSessionBox<Substrate>();
		const session = box.seal(fixture());
		const cloned = structuredClone(session) as never;
		expect(box.unseal(cloned)).toBeUndefined();
	});

	it('never throws for arbitrary inputs', () => {
		const box = createSessionBox<Substrate>();
		// Shipped consumers pass fabricated sessions (`{} as Session`); unseal
		// must be total over anything an application can hand an adapter.
		expect(box.unseal({} as never)).toBeUndefined();
		expect(box.unseal(null as never)).toBeUndefined();
		expect(box.unseal(undefined as never)).toBeUndefined();
		expect(box.unseal(42 as never)).toBeUndefined();
		expect(box.unseal('session' as never)).toBeUndefined();
	});
});

describe('seal — input contract', () => {
	it('seal(null) round-trips to null', () => {
		const box = createSessionBox<null>();
		const session = box.seal(null);
		expect(box.unseal(session)).toBeNull();
	});

	it('seal(undefined) throws', () => {
		const box = createSessionBox<undefined>();
		expect(() => box.seal(undefined)).toThrow(TypeError);
	});
});
