import type { Transaction } from '@mysten/sui/transactions';
import type { NetworkConfig } from '../constants.js';
import { targets, SUI_CLOCK } from '../constants.js';

/**
 * Withdraw all accumulated fees from the treasury.
 * Requires AdminCap.
 */
export function withdraw(config: NetworkConfig, adminCapId: string, recipient: string) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).withdraw,
			arguments: [
				tx.object(adminCapId),
				tx.object(config.protocolTreasury),
				tx.pure.address(recipient),
			],
		});
	};
}

/**
 * Update the authorization fee in basis points.
 * Requires AdminCap. Cannot exceed maxFeeBps (500 = 5%).
 */
export function updateAuthFeeBps(config: NetworkConfig, adminCapId: string, newBps: bigint) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).updateAuthFeeBps,
			arguments: [
				tx.object(adminCapId),
				tx.object(config.feeConfig),
				tx.pure.u64(newBps),
			],
		});
	};
}

/**
 * Update the mandate creation fee.
 * Requires AdminCap.
 */
export function updateCreationFee(config: NetworkConfig, adminCapId: string, newFee: bigint) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).updateCreationFee,
			arguments: [
				tx.object(adminCapId),
				tx.object(config.feeConfig),
				tx.pure.u64(newFee),
			],
		});
	};
}

/**
 * Set verification tier for an agent.
 * Requires AdminCap.
 */
export function setVerificationTier(
	config: NetworkConfig,
	adminCapId: string,
	passportId: string,
	tier: number,
) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).setVerificationTier,
			arguments: [
				tx.object(adminCapId),
				tx.object(passportId),
				tx.pure.u8(tier),
				tx.object(SUI_CLOCK),
			],
		});
	};
}
