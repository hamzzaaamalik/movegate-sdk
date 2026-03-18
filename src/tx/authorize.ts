import type { Transaction } from '@mysten/sui/transactions';
import type { NetworkConfig } from '../constants.js';
import type { AuthorizeAndReceiptParams } from '../types.js';
import { SUI_CLOCK, targets } from '../constants.js';

/**
 * The critical hot-potato flow: authorize + consume + receipt in a single PTB.
 *
 * This composes three move calls that must happen in the same transaction:
 * 1. authorize_action -> produces AuthToken (hot potato, zero abilities)
 * 2. consume_auth_token -> destructures the token, returns fields
 * 3. create_success_receipt or create_failure_receipt -> freezes receipt on-chain
 *
 * The AuthToken cannot escape the transaction. The Move type system enforces this.
 */
export function authorizeAndReceipt(config: NetworkConfig, params: AuthorizeAndReceiptParams) {
	return (tx: Transaction) => {
		const t = targets(config);

		// Step 1: authorize_action<CoinType> -> AuthToken
		const [authToken] = tx.moveCall({
			target: t.authorizeAction,
			typeArguments: [params.coinType],
			arguments: [
				tx.object(params.mandateId),
				tx.object(params.passportId),
				tx.pure.address(params.protocol),
				tx.pure.u64(params.amount),
				tx.pure.u8(params.actionType),
				tx.object(SUI_CLOCK),
			],
		});

		// Step 2 + 3: consume token and create receipt
		if (params.success) {
			// create_success_receipt consumes the AuthToken
			tx.moveCall({
				target: t.createSuccessReceipt,
				arguments: [
					authToken,
					tx.object(params.mandateId),
					tx.object(params.passportId),
					tx.object(config.agentRegistry),
					tx.pure.address(params.owner),
					tx.pure.address(params.protocol),
					tx.pure.u64(params.amount),
					tx.pure.u8(params.chainDepth ?? 0),
					tx.pure.option('address', params.parentReceiptId ?? null),
					tx.object(SUI_CLOCK),
				],
			});
		} else {
			// create_failure_receipt consumes the AuthToken
			tx.moveCall({
				target: t.createFailureReceipt,
				arguments: [
					authToken,
					tx.object(params.passportId),
					tx.object(config.agentRegistry),
					tx.pure.address(params.owner),
					tx.pure.address(params.protocol),
					tx.pure.u64(params.amount),
					tx.pure.u64(params.failureCode ?? 0n),
					tx.pure.u8(params.chainDepth ?? 0),
					tx.pure.option('address', params.parentReceiptId ?? null),
					tx.object(SUI_CLOCK),
				],
			});
		}
	};
}
