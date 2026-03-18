/**
 * Tests for transaction builder functions.
 * These verify that tx builders produce valid Transaction objects
 * without executing on-chain (dry run only).
 */

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { TESTNET } from '../src/constants.js';
import { registerAgent } from '../src/tx/register.js';
import { createMandate, revokeMandate } from '../src/tx/mandate.js';
import { authorizeAndReceipt } from '../src/tx/authorize.js';
import { withdraw, updateAuthFeeBps, updateCreationFee, setVerificationTier } from '../src/tx/admin.js';
import {
	KNOWN_AGENT_ADDRESS,
	KNOWN_PASSPORT_ID,
	KNOWN_ACTIVE_MANDATE_ID,
	KNOWN_ADMIN_CAP_ID,
} from './setup.js';

describe('registerAgent', () => {
	it('produces a valid transaction thunk', () => {
		const thunk = registerAgent(TESTNET);
		expect(typeof thunk).toBe('function');

		const tx = new Transaction();
		thunk(tx);

		// The tx should have at least one command (moveCall)
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});
});

describe('createMandate', () => {
	it('produces a valid transaction thunk with splitCoins + moveCall + mergeCoins', () => {
		const thunk = createMandate(TESTNET, {
			passportId: KNOWN_PASSPORT_ID,
			agent: KNOWN_AGENT_ADDRESS,
			spendCap: 500_000_000n,
			dailyLimit: 2_000_000_000n,
			allowedProtocols: [KNOWN_AGENT_ADDRESS],
			allowedCoinTypes: [],
			allowedActions: [1, 2],
			expiresAtMs: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000),
			minAgentScore: null,
			paymentAmount: 10_000_000n,
		});

		expect(typeof thunk).toBe('function');

		const tx = new Transaction();
		const mandate = thunk(tx);

		// Should have: splitCoins, makeMoveVec, moveCall, mergeCoins
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(3);
		// mandate should be a TransactionObjectArgument
		expect(mandate).toBeDefined();
	});
});

describe('revokeMandate', () => {
	it('produces a valid transaction thunk', () => {
		const thunk = revokeMandate(TESTNET, {
			mandateId: KNOWN_ACTIVE_MANDATE_ID,
			passportId: KNOWN_PASSPORT_ID,
			reason: 1,
		});

		const tx = new Transaction();
		thunk(tx);
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});
});

describe('authorizeAndReceipt', () => {
	it('produces a success receipt thunk with 2 moveCall commands', () => {
		const thunk = authorizeAndReceipt(TESTNET, {
			mandateId: KNOWN_ACTIVE_MANDATE_ID,
			passportId: KNOWN_PASSPORT_ID,
			protocol: KNOWN_AGENT_ADDRESS,
			amount: 1_000_000n,
			actionType: 1,
			coinType: '0x2::sui::SUI',
			owner: KNOWN_AGENT_ADDRESS,
			success: true,
		});

		const tx = new Transaction();
		thunk(tx);
		// Should have: authorize_action + create_success_receipt
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(2);
	});

	it('produces a failure receipt thunk with 2 moveCall commands', () => {
		const thunk = authorizeAndReceipt(TESTNET, {
			mandateId: KNOWN_ACTIVE_MANDATE_ID,
			passportId: KNOWN_PASSPORT_ID,
			protocol: KNOWN_AGENT_ADDRESS,
			amount: 1_000_000n,
			actionType: 1,
			coinType: '0x2::sui::SUI',
			owner: KNOWN_AGENT_ADDRESS,
			success: false,
			failureCode: 42n,
		});

		const tx = new Transaction();
		thunk(tx);
		// Should have: authorize_action + create_failure_receipt
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(2);
	});
});

describe('admin tx builders', () => {
	it('withdraw produces a valid thunk', () => {
		const thunk = withdraw(TESTNET, KNOWN_ADMIN_CAP_ID, KNOWN_AGENT_ADDRESS);
		const tx = new Transaction();
		thunk(tx);
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});

	it('updateAuthFeeBps produces a valid thunk', () => {
		const thunk = updateAuthFeeBps(TESTNET, KNOWN_ADMIN_CAP_ID, 50n);
		const tx = new Transaction();
		thunk(tx);
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});

	it('updateCreationFee produces a valid thunk', () => {
		const thunk = updateCreationFee(TESTNET, KNOWN_ADMIN_CAP_ID, 20_000_000n);
		const tx = new Transaction();
		thunk(tx);
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});

	it('setVerificationTier produces a valid thunk', () => {
		const thunk = setVerificationTier(TESTNET, KNOWN_ADMIN_CAP_ID, KNOWN_PASSPORT_ID, 2);
		const tx = new Transaction();
		thunk(tx);
		expect(tx.getData().commands.length).toBeGreaterThanOrEqual(1);
	});
});
