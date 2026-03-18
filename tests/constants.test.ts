/**
 * Tests for constants and configuration.
 */

import { describe, it, expect } from 'vitest';
import { TESTNET, MAINNET, getNetworkConfig, targets, SUI_CLOCK } from '../src/constants.js';

describe('Network configs', () => {
	it('TESTNET has all required fields populated', () => {
		expect(TESTNET.packageId).toMatch(/^0x[0-9a-f]{64}$/);
		expect(TESTNET.publishedAt).toMatch(/^0x[0-9a-f]{64}$/);
		expect(TESTNET.agentRegistry).toMatch(/^0x[0-9a-f]{64}$/);
		expect(TESTNET.mandateRegistry).toMatch(/^0x[0-9a-f]{64}$/);
		expect(TESTNET.feeConfig).toMatch(/^0x[0-9a-f]{64}$/);
		expect(TESTNET.protocolTreasury).toMatch(/^0x[0-9a-f]{64}$/);
	});

	it('MAINNET fields are empty (not yet deployed)', () => {
		expect(MAINNET.packageId).toBe('');
		expect(MAINNET.publishedAt).toBe('');
	});

	it('getNetworkConfig returns correct config', () => {
		expect(getNetworkConfig('testnet')).toBe(TESTNET);
		expect(getNetworkConfig('mainnet')).toBe(MAINNET);
	});

	it('getNetworkConfig throws for unknown network', () => {
		expect(() => getNetworkConfig('devnet' as any)).toThrow('Unknown network');
	});

	it('SUI_CLOCK is 0x6', () => {
		expect(SUI_CLOCK).toBe('0x6');
	});
});

describe('targets', () => {
	it('generates correct move call targets', () => {
		const t = targets(TESTNET);

		expect(t.registerAgent).toContain('::passport::register_agent');
		expect(t.createMandate).toContain('::mandate::create_mandate');
		expect(t.authorizeAction).toContain('::mandate::authorize_action');
		expect(t.consumeAuthToken).toContain('::mandate::consume_auth_token');
		expect(t.revokeMandate).toContain('::mandate::revoke_mandate');
		expect(t.delegateMandate).toContain('::mandate::delegate_mandate');
		expect(t.createSuccessReceipt).toContain('::receipt::create_success_receipt');
		expect(t.createFailureReceipt).toContain('::receipt::create_failure_receipt');
		expect(t.withdraw).toContain('::treasury::withdraw');
		expect(t.updateAuthFeeBps).toContain('::treasury::update_auth_fee_bps');
		expect(t.updateCreationFee).toContain('::treasury::update_creation_fee');
		expect(t.calculateAuthFee).toContain('::treasury::calculate_auth_fee');
	});

	it('uses publishedAt (not packageId) as the package prefix', () => {
		const t = targets(TESTNET);
		expect(t.registerAgent.startsWith(TESTNET.publishedAt)).toBe(true);
	});
});
