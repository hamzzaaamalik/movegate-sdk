/**
 * Network configuration for MoveGate Protocol deployments.
 *
 * Each network has the published package ID and all shared object IDs
 * created during the init() functions of treasury, passport and mandate modules.
 */

export interface NetworkConfig {
	/** Published package ID (version 1, immutable) */
	packageId: string;
	/** Upgraded package ID (latest version, use for move calls) */
	publishedAt: string;
	/** AgentRegistry shared object (passport module) */
	agentRegistry: string;
	/** MandateRegistry shared object (mandate module) */
	mandateRegistry: string;
	/** FeeConfig shared object (treasury module) */
	feeConfig: string;
	/** ProtocolTreasury shared object (treasury module) */
	protocolTreasury: string;
}

export const TESTNET: NetworkConfig = {
	packageId: '0xec91e604714e263ad43723d43470f236607bd0b13f64731aad36b00a61cf884a',
	publishedAt: '0x1e7fbc6ee51094c3df050fade2e37455adfef7de4d9b79c84a168910067c9f46',
	agentRegistry: '0xb2fadc7ccf9c7b578ba3b1adb8ebfd73191563e536b6b2cc18aa14dac6c7ba46',
	mandateRegistry: '0x26a66d91fef324b833d07d134e5ab6e796e0dfd77f670c27da099479d939b0d3',
	feeConfig: '0x5c92c420f4b3801eb4126fcab6cb4b98212b31f591b4b3d0a025b4e4957120f3',
	protocolTreasury: '0xf0714bd816e595cacfc9e5921d1754cca0205f6b65867eab6183d0b0a98fc82c',
};

export const MAINNET: NetworkConfig = {
	packageId: '',
	publishedAt: '',
	agentRegistry: '',
	mandateRegistry: '',
	feeConfig: '',
	protocolTreasury: '',
};

export type Network = 'testnet' | 'mainnet';

export function getNetworkConfig(network: Network): NetworkConfig {
	switch (network) {
		case 'testnet':
			return TESTNET;
		case 'mainnet':
			return MAINNET;
		default:
			throw new Error(`Unknown network: ${network}`);
	}
}

/** Sui shared Clock object */
export const SUI_CLOCK = '0x6';

/** Move module targets for the current package */
export function targets(config: NetworkConfig) {
	const pkg = config.publishedAt;
	return {
		// passport
		registerAgent: `${pkg}::passport::register_agent` as const,
		setVerificationTier: `${pkg}::passport::set_verification_tier` as const,
		// mandate
		createMandate: `${pkg}::mandate::create_mandate` as const,
		authorizeAction: `${pkg}::mandate::authorize_action` as const,
		consumeAuthToken: `${pkg}::mandate::consume_auth_token` as const,
		revokeMandate: `${pkg}::mandate::revoke_mandate` as const,
		delegateMandate: `${pkg}::mandate::delegate_mandate` as const,
		// receipt
		createSuccessReceipt: `${pkg}::receipt::create_success_receipt` as const,
		createFailureReceipt: `${pkg}::receipt::create_failure_receipt` as const,
		// treasury
		withdraw: `${pkg}::treasury::withdraw` as const,
		updateAuthFeeBps: `${pkg}::treasury::update_auth_fee_bps` as const,
		updateCreationFee: `${pkg}::treasury::update_creation_fee` as const,
		calculateAuthFee: `${pkg}::treasury::calculate_auth_fee` as const,
	};
}
