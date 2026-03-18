/**
 * Tests for event type helpers.
 * These are pure/unit tests - no network calls needed.
 */

import { describe, it, expect } from 'vitest';
import { getEventType, parseEventsFromTx } from '../src/queries/events.js';
import { TESTNET } from '../src/constants.js';

describe('getEventType', () => {
	it('returns fully qualified event type for PassportCreated', () => {
		const type = getEventType(TESTNET, 'PassportCreated');
		expect(type).toBe(`${TESTNET.packageId}::events::PassportCreated`);
	});

	it('returns fully qualified event type for MandateCreated', () => {
		const type = getEventType(TESTNET, 'MandateCreated');
		expect(type).toBe(`${TESTNET.packageId}::events::MandateCreated`);
	});

	it('returns fully qualified event type for ActionAuthorized', () => {
		const type = getEventType(TESTNET, 'ActionAuthorized');
		expect(type).toBe(`${TESTNET.packageId}::events::ActionAuthorized`);
	});

	it('returns correct type for all event names', () => {
		const eventNames = [
			'PassportCreated',
			'ScoreUpdated',
			'VerificationTierChanged',
			'MandateCreated',
			'MandateRevoked',
			'MandateDelegated',
			'ActionAuthorized',
			'ReceiptCreated',
			'FeeCollected',
			'TreasuryWithdrawal',
			'FeeConfigUpdated',
		] as const;

		for (const name of eventNames) {
			const type = getEventType(TESTNET, name);
			expect(type).toMatch(new RegExp(`::events::${name}$`));
		}
	});
});

describe('parseEventsFromTx', () => {
	it('extracts matching events from a mock tx result', () => {
		const events = [
			{
				type: `${TESTNET.packageId}::events::PassportCreated`,
				parsedJson: { passportId: '0xabc', agent: '0xdef' },
			},
			{
				type: `${TESTNET.packageId}::events::MandateCreated`,
				parsedJson: { mandateId: '0x123' },
			},
			{
				type: `${TESTNET.packageId}::events::PassportCreated`,
				parsedJson: { passportId: '0xghi', agent: '0xjkl' },
			},
		];

		const passportEvents = parseEventsFromTx<{ passportId: string; agent: string }>(
			events,
			TESTNET,
			'PassportCreated',
		);

		expect(passportEvents).toHaveLength(2);
		expect(passportEvents[0].passportId).toBe('0xabc');
		expect(passportEvents[1].passportId).toBe('0xghi');
	});

	it('returns empty array when no matching events', () => {
		const events = [
			{
				type: `${TESTNET.packageId}::events::MandateCreated`,
				parsedJson: { mandateId: '0x123' },
			},
		];

		const result = parseEventsFromTx(events, TESTNET, 'PassportCreated');
		expect(result).toHaveLength(0);
	});

	it('returns empty array for empty events', () => {
		const result = parseEventsFromTx([], TESTNET, 'PassportCreated');
		expect(result).toHaveLength(0);
	});
});
