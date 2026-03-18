/**
 * Client type abstraction for MoveGate SDK.
 *
 * Uses SuiGrpcClient from @mysten/sui v2.x as the primary client.
 * All queries use the `json` include option for parsed field access.
 */

import type { SuiGrpcClient } from '@mysten/sui/grpc';

export type MoveGateTransport = SuiGrpcClient;

/**
 * Fetch an object with parsed JSON fields.
 */
export async function fetchObjectJson(
	client: MoveGateTransport,
	objectId: string,
): Promise<Record<string, unknown>> {
	const result = await client.getObject({
		objectId,
		include: { json: true },
	});
	const json = result.object?.json;
	if (!json || typeof json !== 'object') {
		throw new Error(`Object not found: ${objectId}`);
	}
	return json as Record<string, unknown>;
}
