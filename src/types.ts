/**
 * TypeScript interfaces for all MoveGate on-chain objects.
 * These map 1:1 to the Move structs in the smart contracts.
 */

// ═══════════════════════════════════════════════════════════════════
// Passport
// ═══════════════════════════════════════════════════════════════════

export interface AgentPassport {
	id: string;
	agent: string;
	registeredAtMs: bigint;
	registeredAtEpoch: bigint;
	totalActions: bigint;
	successfulActions: bigint;
	failedActions: bigint;
	totalVolumeMist: bigint;
	uniqueUsers: bigint;
	uniqueProtocols: bigint;
	revocationsReceived: bigint;
	consecutiveSuccesses: bigint;
	lastActionEpoch: bigint;
	activeMandateCount: bigint;
	reputationScore: bigint;
	lastScoreUpdateEpoch: bigint;
	verificationTier: number;
	verified: boolean;
	verifiedAtMs: bigint | null;
	topProtocols: string[];
}

export interface AgentRegistryData {
	id: string;
	totalRegistered: bigint;
	totalActionsAllTime: bigint;
	totalVolumeAllTime: bigint;
}

// ═══════════════════════════════════════════════════════════════════
// Mandate
// ═══════════════════════════════════════════════════════════════════

export interface Mandate {
	id: string;
	owner: string;
	agent: string;
	spendCap: bigint;
	dailyLimit: bigint;
	spentThisEpoch: bigint;
	lastResetEpoch: bigint;
	allowedProtocols: string[];
	allowedCoinTypes: string[];
	allowedActions: number[];
	createdAtMs: bigint;
	expiresAtMs: bigint;
	revoked: boolean;
	revokedAtMs: bigint | null;
	revokeReason: number | null;
	totalActions: bigint;
	successfulActions: bigint;
	totalVolume: bigint;
	parentMandateId: string | null;
	maxDelegationDepth: number;
	currentDepth: number;
	minAgentScore: bigint | null;
}

export interface MandateRegistryData {
	id: string;
	totalMandatesCreated: bigint;
	totalMandatesActive: bigint;
	totalMandatesRevoked: bigint;
}

// ═══════════════════════════════════════════════════════════════════
// Receipt
// ═══════════════════════════════════════════════════════════════════

export interface ActionReceipt {
	id: string;
	mandateId: string;
	agent: string;
	owner: string;
	protocol: string;
	coinType: string;
	amount: bigint;
	actionType: number;
	epoch: bigint;
	timestampMs: bigint;
	success: boolean;
	failureCode: bigint | null;
	chainDepth: number;
	parentReceiptId: string | null;
	agentScoreAtTime: bigint;
}

// ═══════════════════════════════════════════════════════════════════
// Treasury
// ═══════════════════════════════════════════════════════════════════

export interface FeeConfig {
	id: string;
	creationFee: bigint;
	authFeeBps: bigint;
	maxFeeBps: bigint;
}

export interface ProtocolTreasuryData {
	id: string;
	balance: bigint;
	totalCollected: bigint;
	totalWithdrawn: bigint;
}

// ═══════════════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════════════

export interface PassportCreatedEvent {
	passportId: string;
	agent: string;
	epoch: bigint;
	timestampMs: bigint;
}

export interface ScoreUpdatedEvent {
	agent: string;
	oldScore: bigint;
	newScore: bigint;
	epoch: bigint;
}

export interface VerificationTierChangedEvent {
	agent: string;
	oldTier: number;
	newTier: number;
}

export interface MandateCreatedEvent {
	mandateId: string;
	owner: string;
	agent: string;
	spendCap: bigint;
	dailyLimit: bigint;
	expiresAtMs: bigint;
	protocolCount: bigint;
}

export interface MandateRevokedEvent {
	mandateId: string;
	owner: string;
	agent: string;
	revokeReason: number;
	epoch: bigint;
	timestampMs: bigint;
}

export interface MandateDelegatedEvent {
	parentMandateId: string;
	childMandateId: string;
	agent: string;
	depth: number;
}

export interface ActionAuthorizedEvent {
	mandateId: string;
	agent: string;
	protocol: string;
	coinType: string;
	amount: bigint;
	actionType: number;
	agentScore: bigint;
	epoch: bigint;
}

export interface ReceiptCreatedEvent {
	receiptId: string;
	mandateId: string;
	agent: string;
	owner: string;
	protocol: string;
	amount: bigint;
	success: boolean;
	epoch: bigint;
}

export interface FeeCollectedEvent {
	amount: bigint;
	source: number;
	epoch: bigint;
}

export interface TreasuryWithdrawalEvent {
	amount: bigint;
	recipient: string;
	epoch: bigint;
}

export interface FeeConfigUpdatedEvent {
	oldFeeBps: bigint;
	newFeeBps: bigint;
}

// ═══════════════════════════════════════════════════════════════════
// Transaction Input Types
// ═══════════════════════════════════════════════════════════════════

export interface CreateMandateParams {
	/** Agent passport object ID (shared object) */
	passportId: string;
	agent: string;
	spendCap: bigint;
	dailyLimit: bigint;
	allowedProtocols: string[];
	allowedCoinTypes: string[];
	allowedActions: number[];
	expiresAtMs: bigint;
	minAgentScore: bigint | null;
	paymentAmount: bigint;
}

export interface AuthorizeAndReceiptParams {
	mandateId: string;
	passportId: string;
	protocol: string;
	amount: bigint;
	actionType: number;
	coinType: string;
	owner: string;
	success: boolean;
	failureCode?: bigint;
	chainDepth?: number;
	parentReceiptId?: string;
}

export interface RevokeMandateParams {
	mandateId: string;
	passportId: string;
	reason: number;
}

export interface DelegateMandateParams {
	parentMandateId: string;
	agent: string;
	spendCap: bigint;
	dailyLimit: bigint;
	allowedProtocols: string[];
	expiresAtMs: bigint;
}
