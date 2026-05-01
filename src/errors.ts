// SPDX-License-Identifier: Apache-2.0
/**
 * Typed errors that adapters MAY throw at port boundaries.
 *
 * SPEC.md §6.2 gives `currentUpactor` the return type
 * `Promise<Upactor | null>`, where `null` means "no authenticated
 * user." A substrate outage is a categorically different condition —
 * the substrate cannot answer the question — and collapsing it into the
 * `null` channel forces every caller to choose between misclassifying
 * outage as logged-out or treating every `null` as suspicious.
 *
 * Adapters MAY throw `SubstrateUnavailableError` to keep the outage
 * signal distinct from the logged-out signal. Applications that don't
 * care let it propagate to their framework's error boundary (the same
 * way any uncaught exception bubbles up). Applications that want to
 * render an outage-specific banner catch this type.
 *
 * The `kind` field mirrors the `AuthError.code` vocabulary used at the
 * `authenticate` boundary so the two error surfaces share one
 * vocabulary across the port.
 */
export class SubstrateUnavailableError extends Error {
	readonly kind = 'substrate_unavailable' as const;
	constructor(message = 'identity substrate is unreachable') {
		super(message);
		this.name = 'SubstrateUnavailableError';
	}
}
