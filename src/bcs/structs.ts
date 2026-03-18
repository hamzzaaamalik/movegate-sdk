/**
 * BCS type definitions for parsing MoveGate on-chain objects.
 *
 * These match the Move structs exactly and allow decoding raw object content
 * returned by getObject({ include: { json: true } }).
 *
 * All field accessors use runtime type checks — no blind `as` casts.
 */

import type {
	AgentPassport,
	AgentRegistryData,
	Mandate,
	FeeConfig,
	ProtocolTreasuryData,
	ActionReceipt,
	MandateRegistryData,
} from '../types.js';

// ═══════════════════════════════════════════════════════════════════
// Field parsers for SuiParsedData (JSON content from RPC)
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse raw SuiParsedData fields into a typed AgentPassport.
 * Works with the JSON content returned by getObject with include: { json: true }.
 */
export function parsePassport(fields: Record<string, unknown>): AgentPassport {
	return {
		id: parseId(fields.id),
		agent: str(fields.agent),
		registeredAtMs: bigint_(fields.registered_at_ms),
		registeredAtEpoch: bigint_(fields.registered_at_epoch),
		totalActions: bigint_(fields.total_actions),
		successfulActions: bigint_(fields.successful_actions),
		failedActions: bigint_(fields.failed_actions),
		totalVolumeMist: bigint_(fields.total_volume_mist),
		uniqueUsers: bigint_(fields.unique_users),
		uniqueProtocols: bigint_(fields.unique_protocols),
		revocationsReceived: bigint_(fields.revocations_received),
		consecutiveSuccesses: bigint_(fields.consecutive_successes),
		lastActionEpoch: bigint_(fields.last_action_epoch),
		activeMandateCount: bigint_(fields.active_mandate_count),
		reputationScore: bigint_(fields.reputation_score),
		lastScoreUpdateEpoch: bigint_(fields.last_score_update_epoch),
		verificationTier: num(fields.verification_tier),
		verified: bool(fields.verified),
		verifiedAtMs: parseOptionBigInt(fields.verified_at_ms),
		topProtocols: strArray(fields.top_protocols),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed Mandate.
 */
export function parseMandate(fields: Record<string, unknown>): Mandate {
	return {
		id: parseId(fields.id),
		owner: str(fields.owner),
		agent: str(fields.agent),
		spendCap: bigint_(fields.spend_cap),
		dailyLimit: bigint_(fields.daily_limit),
		spentThisEpoch: bigint_(fields.spent_this_epoch),
		lastResetEpoch: bigint_(fields.last_reset_epoch),
		allowedProtocols: strArray(fields.allowed_protocols),
		allowedCoinTypes: parseTypeNames(fields.allowed_coin_types),
		allowedActions: parseU8Array(fields.allowed_actions),
		createdAtMs: bigint_(fields.created_at_ms),
		expiresAtMs: bigint_(fields.expires_at_ms),
		revoked: bool(fields.revoked),
		revokedAtMs: parseOptionBigInt(fields.revoked_at_ms),
		revokeReason: parseOptionNumber(fields.revoke_reason),
		totalActions: bigint_(fields.total_actions),
		successfulActions: bigint_(fields.successful_actions),
		totalVolume: bigint_(fields.total_volume),
		parentMandateId: parseOptionString(fields.parent_mandate_id),
		maxDelegationDepth: num(fields.max_delegation_depth),
		currentDepth: num(fields.current_depth),
		minAgentScore: parseOptionBigInt(fields.min_agent_score),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed FeeConfig.
 */
export function parseFeeConfig(fields: Record<string, unknown>): FeeConfig {
	return {
		id: parseId(fields.id),
		creationFee: bigint_(fields.creation_fee),
		authFeeBps: bigint_(fields.auth_fee_bps),
		maxFeeBps: bigint_(fields.max_fee_bps),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed ProtocolTreasuryData.
 */
export function parseTreasury(fields: Record<string, unknown>): ProtocolTreasuryData {
	return {
		id: parseId(fields.id),
		balance: parseBalance(fields.balance),
		totalCollected: bigint_(fields.total_collected),
		totalWithdrawn: bigint_(fields.total_withdrawn),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed ActionReceipt.
 */
export function parseReceipt(fields: Record<string, unknown>): ActionReceipt {
	return {
		id: parseId(fields.id),
		mandateId: str(fields.mandate_id),
		agent: str(fields.agent),
		owner: str(fields.owner),
		protocol: str(fields.protocol),
		coinType: parseTypeName(fields.coin_type),
		amount: bigint_(fields.amount),
		actionType: num(fields.action_type),
		epoch: bigint_(fields.epoch),
		timestampMs: bigint_(fields.timestamp_ms),
		success: bool(fields.success),
		failureCode: parseOptionBigInt(fields.failure_code),
		chainDepth: num(fields.chain_depth),
		parentReceiptId: parseOptionString(fields.parent_receipt_id),
		agentScoreAtTime: bigint_(fields.agent_score_at_time),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed AgentRegistryData.
 */
export function parseAgentRegistry(fields: Record<string, unknown>): AgentRegistryData {
	return {
		id: parseId(fields.id),
		totalRegistered: bigint_(fields.total_registered),
		totalActionsAllTime: bigint_(fields.total_actions_all_time),
		totalVolumeAllTime: bigint_(fields.total_volume_all_time),
	};
}

/**
 * Parse raw SuiParsedData fields into a typed MandateRegistryData.
 */
export function parseMandateRegistry(fields: Record<string, unknown>): MandateRegistryData {
	return {
		id: parseId(fields.id),
		totalMandatesCreated: bigint_(fields.total_mandates_created),
		totalMandatesActive: bigint_(fields.total_mandates_active),
		totalMandatesRevoked: bigint_(fields.total_mandates_revoked),
	};
}

// ═══════════════════════════════════════════════════════════════════
// Runtime-safe primitive extractors
// ═══════════════════════════════════════════════════════════════════

/** Extract a string, coercing non-strings via String(). */
function str(raw: unknown): string {
	if (typeof raw === 'string') return raw;
	if (raw === null || raw === undefined) return '';
	return String(raw);
}

/** Extract a bigint from string | number | bigint. */
function bigint_(raw: unknown): bigint {
	if (typeof raw === 'bigint') return raw;
	if (typeof raw === 'string') return BigInt(raw);
	if (typeof raw === 'number') return BigInt(raw);
	return 0n;
}

/** Extract a number, coercing via Number(). */
function num(raw: unknown): number {
	if (typeof raw === 'number') return raw;
	if (typeof raw === 'string') return Number(raw);
	return 0;
}

/** Extract a boolean with strict checking. */
function bool(raw: unknown): boolean {
	if (typeof raw === 'boolean') return raw;
	return false;
}

/** Extract a string array, returning [] for non-arrays. */
function strArray(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(str);
}

// ═══════════════════════════════════════════════════════════════════
// Structural parsers
// ═══════════════════════════════════════════════════════════════════

function parseId(raw: unknown): string {
	if (typeof raw === 'string') return raw;
	if (raw && typeof raw === 'object' && 'id' in raw) {
		const id = (raw as Record<string, unknown>).id;
		return typeof id === 'string' ? id : '';
	}
	return '';
}

function parseOptionBigInt(raw: unknown): bigint | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === 'string') return BigInt(raw);
	if (typeof raw === 'number') return BigInt(raw);
	return null;
}

function parseOptionNumber(raw: unknown): number | null {
	if (raw === null || raw === undefined) return null;
	return Number(raw);
}

function parseOptionString(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === 'string') return raw;
	return null;
}

function parseTypeName(raw: unknown): string {
	if (typeof raw === 'string') return raw;
	if (raw && typeof raw === 'object' && 'name' in raw) {
		const name = (raw as Record<string, unknown>).name;
		return typeof name === 'string' ? name : '';
	}
	return '';
}

function parseTypeNames(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(parseTypeName);
}

function parseBalance(raw: unknown): bigint {
	// gRPC JSON flattens Balance<SUI> to its string value directly
	if (typeof raw === 'string') return BigInt(raw);
	if (typeof raw === 'number') return BigInt(raw);
	// Fallback: nested { fields: { value: "..." } } format (legacy/alternative)
	if (raw && typeof raw === 'object') {
		const obj = raw as Record<string, unknown>;
		if ('value' in obj && (typeof obj.value === 'string' || typeof obj.value === 'number')) {
			return BigInt(obj.value);
		}
		if ('fields' in obj && obj.fields && typeof obj.fields === 'object') {
			const fields = obj.fields as Record<string, unknown>;
			if ('value' in fields && (typeof fields.value === 'string' || typeof fields.value === 'number')) {
				return BigInt(fields.value);
			}
		}
	}
	return 0n;
}

function parseU8Array(raw: unknown): number[] {
	if (Array.isArray(raw)) return raw.map(Number);
	// Base64-encoded BCS bytes (Sui JSON returns vector<u8> as base64)
	if (typeof raw === 'string') {
		const bytes = Buffer.from(raw, 'base64');
		return Array.from(bytes);
	}
	return [];
}
