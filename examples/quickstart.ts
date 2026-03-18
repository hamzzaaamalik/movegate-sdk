/**
 * MoveGate SDK -- Quickstart
 *
 * Demonstrates how to connect to Sui testnet, initialize the MoveGate
 * client using the $extend pattern, and read on-chain protocol state.
 *
 * Prerequisites:
 *   npm install @movegate/sdk @mysten/sui
 *
 * Run:
 *   npx tsx examples/quickstart.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { movegate } from '../src/index.js';

// ---------------------------------------------------------------------------
// 1. Connect to Sui testnet with the MoveGate extension
// ---------------------------------------------------------------------------

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(movegate({ network: 'testnet' }));

// All MoveGate methods are now available under `client.movegate.*`

async function main() {
	// -----------------------------------------------------------------------
	// 2. Read global protocol state
	// -----------------------------------------------------------------------

	const [agentRegistry, mandateRegistry, feeConfig, treasury] = await Promise.all([
		client.movegate.getAgentRegistry(),
		client.movegate.getMandateRegistry(),
		client.movegate.getFeeConfig(),
		client.movegate.getTreasuryBalance(),
	]);

	console.log('--- Protocol State ---');
	console.log(`Registered agents:    ${agentRegistry.totalRegistered}`);
	console.log(`Total actions:        ${agentRegistry.totalActionsAllTime}`);
	console.log(`Total volume (MIST):  ${agentRegistry.totalVolumeAllTime}`);
	console.log();
	console.log(`Mandates created:     ${mandateRegistry.totalMandatesCreated}`);
	console.log(`Mandates active:      ${mandateRegistry.totalMandatesActive}`);
	console.log(`Mandates revoked:     ${mandateRegistry.totalMandatesRevoked}`);
	console.log();
	console.log(`Creation fee:         ${feeConfig.creationFee} MIST (${Number(feeConfig.creationFee) / 1e9} SUI)`);
	console.log(`Auth fee:             ${feeConfig.authFeeBps} bps`);
	console.log(`Max fee cap:          ${feeConfig.maxFeeBps} bps`);
	console.log();
	console.log(`Treasury balance:     ${treasury.balance} MIST`);
	console.log(`Total collected:      ${treasury.totalCollected} MIST`);
	console.log(`Total withdrawn:      ${treasury.totalWithdrawn} MIST`);

	// -----------------------------------------------------------------------
	// 3. Look up a specific agent
	// -----------------------------------------------------------------------

	const agentAddress = '0xaca7964ff16c481ae3c2f43580accd730574d87badc5557719af58abe50b47e3';

	const hasPassport = await client.movegate.hasPassport(agentAddress);
	console.log();
	console.log('--- Agent Lookup ---');
	console.log(`Address:              ${agentAddress}`);
	console.log(`Has passport:         ${hasPassport}`);

	if (hasPassport) {
		const passportId = await client.movegate.getPassportIdByAgent(agentAddress);
		if (!passportId) return;

		const passport = await client.movegate.getPassport(passportId);

		console.log(`Passport ID:          ${passport.id}`);
		console.log(`Reputation score:     ${passport.reputationScore}`);
		console.log(`Verification tier:    ${passport.verificationTier}`);
		console.log(`Verified:             ${passport.verified}`);
		console.log(`Total actions:        ${passport.totalActions}`);
		console.log(`Successful actions:   ${passport.successfulActions}`);
		console.log(`Active mandates:      ${passport.activeMandateCount}`);
		console.log(`Registered at:        ${new Date(Number(passport.registeredAtMs)).toISOString()}`);
	}

	// -----------------------------------------------------------------------
	// 4. List mandates owned by the agent
	// -----------------------------------------------------------------------

	const mandates = await client.movegate.getMandatesByOwner(agentAddress);
	console.log();
	console.log(`--- Mandates (${mandates.length}) ---`);

	for (const mandate of mandates) {
		const status = mandate.revoked ? 'REVOKED' : 'ACTIVE';
		const expires = new Date(Number(mandate.expiresAtMs)).toISOString();

		console.log(`  [${status}] ${mandate.id}`);
		console.log(`    Agent:            ${mandate.agent}`);
		console.log(`    Spend cap:        ${mandate.spendCap} MIST`);
		console.log(`    Daily limit:      ${mandate.dailyLimit} MIST`);
		console.log(`    Expires:          ${expires}`);
		console.log(`    Allowed actions:  [${mandate.allowedActions.join(', ')}]`);
		console.log(`    Total actions:    ${mandate.totalActions}`);
		console.log();
	}

	// -----------------------------------------------------------------------
	// 5. Get event type strings (for indexing or subscriptions)
	// -----------------------------------------------------------------------

	console.log('--- Event Types ---');
	const eventNames = [
		'PassportCreated',
		'MandateCreated',
		'ActionAuthorized',
		'ReceiptCreated',
		'MandateRevoked',
	] as const;

	for (const name of eventNames) {
		console.log(`  ${name}: ${client.movegate.getEventType(name)}`);
	}
}

main().catch(console.error);
