/**
 * Integration tests for MoveGate SDK read queries.
 * All tests hit the live Sui testnet - no mocks.
 */

import { describe, it, expect } from 'vitest';
import {
	createMoveGateClient,
	createExtendedClient,
	KNOWN_AGENT_ADDRESS,
	KNOWN_PASSPORT_ID,
	KNOWN_ACTIVE_MANDATE_ID,
	KNOWN_REVOKED_MANDATE_ID,
	TESTNET_CONFIG,
} from './setup.js';

describe('Passport queries', () => {
	const mg = createMoveGateClient();

	it('getPassport returns a typed AgentPassport', async () => {
		const passport = await mg.getPassport(KNOWN_PASSPORT_ID);

		expect(passport.id).toBe(KNOWN_PASSPORT_ID);
		expect(passport.agent).toBe(KNOWN_AGENT_ADDRESS);
		expect(passport.verified).toBe(true);
		expect(passport.verificationTier).toBe(1);
		expect(typeof passport.reputationScore).toBe('bigint');
		expect(typeof passport.totalActions).toBe('bigint');
		expect(typeof passport.registeredAtMs).toBe('bigint');
		expect(passport.registeredAtMs).toBeGreaterThan(0n);
		expect(Array.isArray(passport.topProtocols)).toBe(true);
	});

	it('getAgentRegistry returns global stats', async () => {
		const registry = await mg.getAgentRegistry();

		expect(registry.id).toBe(TESTNET_CONFIG.agentRegistry);
		expect(registry.totalRegistered).toBeGreaterThanOrEqual(1n);
		expect(typeof registry.totalActionsAllTime).toBe('bigint');
		expect(typeof registry.totalVolumeAllTime).toBe('bigint');
	});

	it('hasPassport returns true for known agent', async () => {
		const has = await mg.hasPassport(KNOWN_AGENT_ADDRESS);
		expect(has).toBe(true);
	});

	it('hasPassport returns false for random address', async () => {
		const has = await mg.hasPassport('0x0000000000000000000000000000000000000000000000000000000000000001');
		expect(has).toBe(false);
	});

	it('getPassportIdByAgent returns passport ID for known agent', async () => {
		const id = await mg.getPassportIdByAgent(KNOWN_AGENT_ADDRESS);
		expect(id).toBe(KNOWN_PASSPORT_ID);
	});

	it('getPassportIdByAgent returns null for unknown agent', async () => {
		const id = await mg.getPassportIdByAgent(
			'0x0000000000000000000000000000000000000000000000000000000000000001',
		);
		expect(id).toBeNull();
	});
});

describe('Mandate queries', () => {
	const mg = createMoveGateClient();

	it('getMandate returns a typed active Mandate', async () => {
		const mandate = await mg.getMandate(KNOWN_ACTIVE_MANDATE_ID);

		expect(mandate.id).toBe(KNOWN_ACTIVE_MANDATE_ID);
		expect(mandate.owner).toBe(KNOWN_AGENT_ADDRESS);
		expect(mandate.agent).toBe(KNOWN_AGENT_ADDRESS);
		expect(mandate.revoked).toBe(false);
		expect(mandate.spendCap).toBeGreaterThan(0n);
		expect(mandate.dailyLimit).toBeGreaterThan(0n);
		expect(mandate.expiresAtMs).toBeGreaterThan(0n);
		expect(typeof mandate.totalActions).toBe('bigint');
		expect(Array.isArray(mandate.allowedProtocols)).toBe(true);
		expect(Array.isArray(mandate.allowedActions)).toBe(true);
	});

	it('getMandate returns a typed revoked Mandate', async () => {
		const mandate = await mg.getMandate(KNOWN_REVOKED_MANDATE_ID);

		expect(mandate.id).toBe(KNOWN_REVOKED_MANDATE_ID);
		expect(mandate.revoked).toBe(true);
		expect(mandate.revokedAtMs).not.toBeNull();
		expect(mandate.revokeReason).not.toBeNull();
	});

	it('getMandateRegistry returns global stats', async () => {
		const registry = await mg.getMandateRegistry();

		expect(registry.id).toBe(TESTNET_CONFIG.mandateRegistry);
		expect(registry.totalMandatesCreated).toBeGreaterThanOrEqual(1n);
		expect(typeof registry.totalMandatesActive).toBe('bigint');
		expect(typeof registry.totalMandatesRevoked).toBe('bigint');
	});

	it('getMandatesByOwner returns mandates for known owner', async () => {
		const mandates = await mg.getMandatesByOwner(KNOWN_AGENT_ADDRESS);

		expect(mandates.length).toBeGreaterThanOrEqual(1);
		for (const m of mandates) {
			expect(m.owner).toBe(KNOWN_AGENT_ADDRESS);
			expect(typeof m.spendCap).toBe('bigint');
		}
	});
});

describe('Treasury queries', () => {
	const mg = createMoveGateClient();

	it('getFeeConfig returns fee configuration', async () => {
		const fees = await mg.getFeeConfig();

		expect(fees.id).toBe(TESTNET_CONFIG.feeConfig);
		expect(fees.creationFee).toBeGreaterThan(0n);
		expect(typeof fees.authFeeBps).toBe('bigint');
		expect(typeof fees.maxFeeBps).toBe('bigint');
		expect(fees.maxFeeBps).toBeGreaterThanOrEqual(fees.authFeeBps);
	});

	it('getTreasuryBalance returns treasury data', async () => {
		const treasury = await mg.getTreasuryBalance();

		expect(treasury.id).toBe(TESTNET_CONFIG.protocolTreasury);
		expect(typeof treasury.balance).toBe('bigint');
		expect(typeof treasury.totalCollected).toBe('bigint');
		expect(typeof treasury.totalWithdrawn).toBe('bigint');
	});
});

describe('$extend pattern', () => {
	it('works with SuiGrpcClient.$extend', async () => {
		const client = createExtendedClient();

		const passport = await client.movegate.getPassport(KNOWN_PASSPORT_ID);
		expect(passport.agent).toBe(KNOWN_AGENT_ADDRESS);
		expect(passport.verified).toBe(true);
	});

	it('exposes config via $extend', () => {
		const client = createExtendedClient();
		expect(client.movegate.config.packageId).toBe(TESTNET_CONFIG.packageId);
	});
});
