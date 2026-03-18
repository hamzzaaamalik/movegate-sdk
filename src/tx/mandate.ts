import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import type { NetworkConfig } from '../constants.js';
import type { CreateMandateParams, RevokeMandateParams, DelegateMandateParams } from '../types.js';
import { SUI_CLOCK, targets } from '../constants.js';

/**
 * Create a new Mandate granting an agent bounded permissions.
 * Returns the Mandate object. Caller must transfer it.
 *
 * The payment coin is auto-split from gas.
 */
export function createMandate(config: NetworkConfig, params: CreateMandateParams) {
	return (tx: Transaction): TransactionObjectArgument => {
		const t = targets(config);

		// Split payment from gas
		const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(params.paymentAmount)]);

		// Build allowed_coin_types as MoveVec<TypeName>.
		// TypeName is a Move struct, not a pure type — it must be constructed
		// via std::type_name::get<T>() which requires compile-time type params.
		// For SDK usage, pass an empty vector to allow all coin types.
		const coinTypes = tx.makeMoveVec({
			type: '0x1::type_name::TypeName',
			elements: [],
		});

		const [mandate] = tx.moveCall({
			target: t.createMandate,
			arguments: [
				tx.object(config.mandateRegistry),
				tx.object(config.agentRegistry),
				tx.object(params.passportId),
				tx.object(config.protocolTreasury),
				tx.object(config.feeConfig),
				tx.pure.address(params.agent),
				tx.pure.u64(params.spendCap),
				tx.pure.u64(params.dailyLimit),
				tx.pure.vector('address', params.allowedProtocols),
				coinTypes,
				tx.pure.vector('u8', params.allowedActions),
				tx.pure.u64(params.expiresAtMs),
				tx.pure.option('u64', params.minAgentScore),
				payment,
				tx.object(SUI_CLOCK),
			],
		});

		// Merge remaining payment back into gas
		tx.mergeCoins(tx.gas, [payment]);

		return mandate;
	};
}

/**
 * Revoke a mandate. Only the mandate owner can revoke.
 */
export function revokeMandate(config: NetworkConfig, params: RevokeMandateParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: targets(config).revokeMandate,
			arguments: [
				tx.object(params.mandateId),
				tx.object(config.mandateRegistry),
				tx.object(params.passportId),
				tx.pure.u8(params.reason),
				tx.object(SUI_CLOCK),
			],
		});
	};
}

/**
 * Delegate a child mandate from a parent. Child limits must be <= parent limits.
 * Returns the child Mandate object. Caller must transfer it.
 */
export function delegateMandate(config: NetworkConfig, params: DelegateMandateParams) {
	return (tx: Transaction): TransactionObjectArgument => {
		const [child] = tx.moveCall({
			target: targets(config).delegateMandate,
			arguments: [
				tx.object(params.parentMandateId),
				tx.object(config.mandateRegistry),
				tx.pure.address(params.agent),
				tx.pure.u64(params.spendCap),
				tx.pure.u64(params.dailyLimit),
				tx.pure.vector('address', params.allowedProtocols),
				tx.pure.u64(params.expiresAtMs),
				tx.object(SUI_CLOCK),
			],
		});
		return child;
	};
}
