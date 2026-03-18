// SDK entry point
export { movegate, MoveGateClient } from './movegate.js';
export type { MoveGateOptions } from './movegate.js';

// Network config
export { TESTNET, MAINNET, getNetworkConfig, SUI_CLOCK, targets } from './constants.js';
export type { NetworkConfig, Network } from './constants.js';

// Types
export type {
	AgentPassport,
	AgentRegistryData,
	Mandate,
	MandateRegistryData,
	ActionReceipt,
	FeeConfig,
	ProtocolTreasuryData,
	CreateMandateParams,
	AuthorizeAndReceiptParams,
	RevokeMandateParams,
	DelegateMandateParams,
	PassportCreatedEvent,
	ScoreUpdatedEvent,
	VerificationTierChangedEvent,
	MandateCreatedEvent,
	MandateRevokedEvent,
	MandateDelegatedEvent,
	ActionAuthorizedEvent,
	ReceiptCreatedEvent,
	FeeCollectedEvent,
	TreasuryWithdrawalEvent,
	FeeConfigUpdatedEvent,
} from './types.js';

// Client type
export type { MoveGateTransport } from './client.js';
export { fetchObjectJson } from './client.js';

// Event helpers
export type { MoveGateEventType, EventQueryOptions } from './queries/events.js';
export { getEventType, parseEventsFromTx } from './queries/events.js';

// BCS parsers (for advanced usage)
export {
	parsePassport,
	parseMandate,
	parseFeeConfig,
	parseTreasury,
	parseReceipt,
	parseAgentRegistry,
	parseMandateRegistry,
} from './bcs/structs.js';

// Transaction builders (for standalone usage without $extend)
export { registerAgent } from './tx/register.js';
export { createMandate, revokeMandate, delegateMandate } from './tx/mandate.js';
export { authorizeAndReceipt } from './tx/authorize.js';
export { withdraw, updateAuthFeeBps, updateCreationFee, setVerificationTier } from './tx/admin.js';
