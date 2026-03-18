import type { Transaction } from '@mysten/sui/transactions';
import type { NetworkConfig } from '../constants.js';
import { SUI_CLOCK, targets } from '../constants.js';

/**
 * Register the sender as an agent. Creates a passport if one does not exist.
 * Free. Idempotent. Safe to call multiple times.
 */
export function registerAgent(config: NetworkConfig) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).registerAgent,
			arguments: [tx.object(config.agentRegistry), tx.object(SUI_CLOCK)],
		});
	};
}
