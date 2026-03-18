/**
 * Shared test setup for MoveGate SDK integration tests.
 * Connects to Sui testnet using SuiGrpcClient.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { TESTNET } from '../src/constants.js';
import { movegate, MoveGateClient } from '../src/movegate.js';

export const TESTNET_CONFIG = TESTNET;

/** Known agent address on testnet */
export const KNOWN_AGENT_ADDRESS =
	'0xaca7964ff16c481ae3c2f43580accd730574d87badc5557719af58abe50b47e3';

/** Known passport object ID (shared object) */
export const KNOWN_PASSPORT_ID =
	'0x6328516d505966b7f93fdbe77f916902378647023824c529692f69eceb7eb0e7';

/** Known mandate object ID (active, not revoked) */
export const KNOWN_ACTIVE_MANDATE_ID =
	'0xb883bcd5f90743b070ca418d4da87188d76fbfb392daf14fb9dbc2dfea52b9b9';

/** Known mandate object ID (revoked) */
export const KNOWN_REVOKED_MANDATE_ID =
	'0x7a7522538dce445cb04426a328c61b7774e7677aff1608ac40497abea9dd9f23';

/** AdminCap object ID (owned by deployer) */
export const KNOWN_ADMIN_CAP_ID =
	'0x37464b867d7d5fa77380ca0ba6ce30bb38680dff0cc69373363a173c10533dd6';

/**
 * Create a raw SuiGrpcClient for direct API calls.
 */
export function createTestClient(): SuiGrpcClient {
	return new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'https://fullnode.testnet.sui.io:443',
	});
}

/**
 * Create a SuiGrpcClient with the movegate $extend plugin.
 */
export function createExtendedClient() {
	return new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'https://fullnode.testnet.sui.io:443',
	}).$extend(movegate({ network: 'testnet' }));
}

/**
 * Create a standalone MoveGateClient (without $extend).
 */
export function createMoveGateClient(): MoveGateClient {
	const client = createTestClient();
	return new MoveGateClient({ client, config: TESTNET_CONFIG });
}
