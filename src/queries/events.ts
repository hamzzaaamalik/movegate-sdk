/**
 * Event query helpers for MoveGate.
 *
 * Note: The gRPC client in @mysten/sui v2 does not expose a direct queryEvents API.
 * Events can be queried via GraphQL or by fetching transaction effects.
 * These helpers provide typed event parsing from transaction results.
 */

import type { NetworkConfig } from '../constants.js';

export type MoveGateEventType =
	| 'PassportCreated'
	| 'ScoreUpdated'
	| 'VerificationTierChanged'
	| 'MandateCreated'
	| 'MandateRevoked'
	| 'MandateDelegated'
	| 'ActionAuthorized'
	| 'ReceiptCreated'
	| 'FeeCollected'
	| 'TreasuryWithdrawal'
	| 'FeeConfigUpdated';

export interface EventQueryOptions {
	limit?: number;
	order?: 'ascending' | 'descending';
	cursor?: string;
}

/**
 * Get the fully qualified Move event type string for a MoveGate event.
 */
export function getEventType(config: NetworkConfig, eventType: MoveGateEventType): string {
	return `${config.packageId}::events::${eventType}`;
}

/**
 * Parse events from a transaction result's events array.
 * Use this after signAndExecuteTransaction to extract typed events.
 */
export function parseEventsFromTx<T = Record<string, unknown>>(
	events: ReadonlyArray<{ type: string; parsedJson?: unknown }>,
	config: NetworkConfig,
	eventType: MoveGateEventType,
): T[] {
	const fullType = getEventType(config, eventType);
	const results: T[] = [];
	for (const e of events) {
		if (e.type === fullType && e.parsedJson != null) {
			// parsedJson comes from Sui RPC as a typed JSON object matching the Move event struct.
			// The caller provides T to match, so this cast is at the boundary layer.
			results.push(e.parsedJson as T);
		}
	}
	return results;
}
