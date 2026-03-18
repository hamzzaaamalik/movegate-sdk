/**
 * MoveGate SDK client extension for Sui.
 *
 * Usage:
 *   import { SuiGrpcClient } from '@mysten/sui/grpc';
 *   import { movegate } from '@movegate/sdk';
 *
 *   const client = new SuiGrpcClient({
 *     network: 'testnet',
 *     baseUrl: 'https://fullnode.testnet.sui.io:443',
 *   }).$extend(movegate({ network: 'testnet' }));
 *
 *   const passport = await client.movegate.getPassport(passportId);
 */

import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { type Network, type NetworkConfig, getNetworkConfig } from './constants.js';

// Queries
import {
	getPassport,
	getAgentRegistry,
	hasPassport,
	getPassportIdByAgent,
} from './queries/passport.js';
import { getMandate, getMandateRegistry, getMandatesByOwner } from './queries/mandate.js';
import { getFeeConfig, getTreasuryBalance } from './queries/treasury.js';
import { getEventType, type MoveGateEventType } from './queries/events.js';

// Transaction builders
import { registerAgent } from './tx/register.js';
import { createMandate, revokeMandate, delegateMandate } from './tx/mandate.js';
import { authorizeAndReceipt } from './tx/authorize.js';
import {
	withdraw,
	updateAuthFeeBps,
	updateCreationFee,
	setVerificationTier,
} from './tx/admin.js';

// Types
import type {
	CreateMandateParams,
	RevokeMandateParams,
	DelegateMandateParams,
	AuthorizeAndReceiptParams,
} from './types.js';

export interface MoveGateOptions<Name = 'movegate'> {
	name?: Name;
	network: Network;
	config?: NetworkConfig;
}

/**
 * Factory function for the $extend pattern.
 *
 * @example
 * import { SuiGrpcClient } from '@mysten/sui/grpc';
 * import { movegate } from '@movegate/sdk';
 *
 * const client = new SuiGrpcClient({
 *   network: 'testnet',
 *   baseUrl: 'https://fullnode.testnet.sui.io:443',
 * }).$extend(movegate({ network: 'testnet' }));
 */
export function movegate<const Name = 'movegate'>({
	name = 'movegate' as Name,
	network,
	config: customConfig,
}: MoveGateOptions<Name>) {
	return {
		name,
		register: (client: SuiGrpcClient) => {
			return new MoveGateClient({
				client,
				config: customConfig ?? getNetworkConfig(network),
			});
		},
	};
}

/**
 * MoveGate protocol client. Provides typed queries and transaction builders
 * for all MoveGate on-chain operations.
 */
export class MoveGateClient {
	readonly #client: SuiGrpcClient;
	readonly #config: NetworkConfig;

	constructor({ client, config }: { client: SuiGrpcClient; config: NetworkConfig }) {
		this.#client = client;
		this.#config = config;
	}

	/** Get the network config used by this client */
	get config(): NetworkConfig {
		return this.#config;
	}

	// ═══════════════════════════════════════════════════════════════
	// Queries
	// ═══════════════════════════════════════════════════════════════

	/** Fetch a passport by its object ID */
	getPassport(passportId: string) {
		return getPassport(this.#client, passportId);
	}

	/** Fetch the global AgentRegistry stats */
	getAgentRegistry() {
		return getAgentRegistry(this.#client, this.#config);
	}

	/** Check if an agent address has a registered passport */
	hasPassport(agentAddress: string) {
		return hasPassport(this.#client, this.#config, agentAddress);
	}

	/** Get a passport object ID by agent address. Returns null if not found. */
	getPassportIdByAgent(agentAddress: string) {
		return getPassportIdByAgent(this.#client, this.#config, agentAddress);
	}

	/** Fetch a mandate by its object ID */
	getMandate(mandateId: string) {
		return getMandate(this.#client, mandateId);
	}

	/** Fetch the global MandateRegistry stats */
	getMandateRegistry() {
		return getMandateRegistry(this.#client, this.#config);
	}

	/** Fetch all mandates owned by a specific address */
	getMandatesByOwner(ownerAddress: string) {
		return getMandatesByOwner(this.#client, this.#config, ownerAddress);
	}

	/** Fetch the current fee configuration */
	getFeeConfig() {
		return getFeeConfig(this.#client, this.#config);
	}

	/** Fetch the protocol treasury balance and stats */
	getTreasuryBalance() {
		return getTreasuryBalance(this.#client, this.#config);
	}

	/** Get the fully qualified event type string for indexing */
	getEventType(eventType: MoveGateEventType) {
		return getEventType(this.#config, eventType);
	}

	// ═══════════════════════════════════════════════════════════════
	// Transaction Builders (return thunks for tx.add)
	// ═══════════════════════════════════════════════════════════════

	tx = {
		/** Register the sender as an agent. Free. Idempotent. */
		registerAgent: () => registerAgent(this.#config),

		/** Create a mandate granting an agent bounded permissions */
		createMandate: (params: CreateMandateParams) => createMandate(this.#config, params),

		/** Revoke a mandate. Owner only. */
		revokeMandate: (params: RevokeMandateParams) => revokeMandate(this.#config, params),

		/** Delegate a child mandate from a parent */
		delegateMandate: (params: DelegateMandateParams) => delegateMandate(this.#config, params),

		/**
		 * The critical hot-potato flow: authorize + consume + receipt in a single PTB.
		 * This is the only way to execute the full auth flow.
		 */
		authorizeAndReceipt: (params: AuthorizeAndReceiptParams) =>
			authorizeAndReceipt(this.#config, params),
	};

	// ═══════════════════════════════════════════════════════════════
	// Admin Transaction Builders (require AdminCap)
	// ═══════════════════════════════════════════════════════════════

	admin = {
		/** Withdraw all fees from treasury */
		withdraw: (adminCapId: string, recipient: string) =>
			withdraw(this.#config, adminCapId, recipient),

		/** Update authorization fee BPS */
		updateAuthFeeBps: (adminCapId: string, newBps: bigint) =>
			updateAuthFeeBps(this.#config, adminCapId, newBps),

		/** Update mandate creation fee */
		updateCreationFee: (adminCapId: string, newFee: bigint) =>
			updateCreationFee(this.#config, adminCapId, newFee),

		/** Set verification tier for an agent */
		setVerificationTier: (adminCapId: string, passportId: string, tier: number) =>
			setVerificationTier(this.#config, adminCapId, passportId, tier),
	};
}
