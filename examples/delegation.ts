/**
 * MoveGate SDK -- Mandate Delegation
 *
 * Demonstrates hierarchical delegation: a mandate holder can create
 * a child mandate with equal or tighter constraints. This enables
 * multi-level agent hierarchies (e.g. a DAO treasury -> fund manager
 * -> sub-agent) with inherited limits and an immutable audit trail.
 *
 * Flow:
 *   1. Query the parent mandate to show current limits
 *   2. Delegate a child mandate with tighter constraints
 *   3. Execute an authorized action through the child
 *
 * Prerequisites:
 *   npm install @movegate/sdk @mysten/sui
 *
 * Run:
 *   PRIVATE_KEY=suiprivkey1... PARENT_MANDATE=0x... PASSPORT=0x... \
 *     npx tsx examples/delegation.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { movegate } from '../src/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PARENT_MANDATE = process.env.PARENT_MANDATE;
const PASSPORT = process.env.PASSPORT;

if (!PRIVATE_KEY || !PARENT_MANDATE || !PASSPORT) {
	console.error('Required env vars:');
	console.error('  PRIVATE_KEY=suiprivkey1...   (agent private key)');
	console.error('  PARENT_MANDATE=0x...         (parent mandate ID)');
	console.error('  PASSPORT=0x...               (agent passport ID)');
	process.exit(1);
}

const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const address = keypair.toSuiAddress();
const parentMandateId: string = PARENT_MANDATE;
const passportId: string = PASSPORT;

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(movegate({ network: 'testnet' }));

async function execute(tx: Transaction, description: string) {
	tx.setSender(address);

	console.log(`\n>>> ${description}`);

	const result = await client.signAndExecuteTransaction({
		transaction: tx,
		signer: keypair,
	});

	if (result.$kind === 'FailedTransaction') {
		throw new Error(`Transaction failed: ${result.FailedTransaction.status?.error}`);
	}

	const txData = result.Transaction;
	console.log(`    Digest: ${txData.digest}`);
	console.log(`    Status: ${txData.status.success ? 'success' : 'failed'}`);

	if (!txData.status.success) {
		throw new Error(`Transaction failed: ${txData.status.error}`);
	}

	return txData;
}

// ---------------------------------------------------------------------------
// Delegation flow
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== MoveGate Mandate Delegation ===');
	console.log(`Delegator: ${address}`);

	// -----------------------------------------------------------------------
	// 1. Read parent mandate to understand current constraints
	// -----------------------------------------------------------------------

	const parent = await client.movegate.getMandate(parentMandateId);

	console.log('\n--- Parent Mandate ---');
	console.log(`  ID:             ${parent.id}`);
	console.log(`  Spend cap:      ${parent.spendCap} MIST`);
	console.log(`  Daily limit:    ${parent.dailyLimit} MIST`);
	console.log(`  Depth:          ${parent.currentDepth} / ${parent.maxDelegationDepth}`);
	console.log(`  Actions:        [${parent.allowedActions.join(', ')}]`);
	console.log(`  Expires:        ${new Date(Number(parent.expiresAtMs)).toISOString()}`);

	if (parent.revoked) {
		console.error('\nParent mandate is revoked. Cannot delegate.');
		process.exit(1);
	}

	if (parent.currentDepth >= parent.maxDelegationDepth) {
		console.error('\nMax delegation depth reached. Cannot delegate further.');
		process.exit(1);
	}

	// -----------------------------------------------------------------------
	// 2. Create a child mandate with tighter constraints
	// -----------------------------------------------------------------------
	// Child constraints MUST be <= parent constraints:
	//   - spend_cap <= parent.spend_cap
	//   - daily_limit <= parent.daily_limit
	//   - expires_at_ms <= parent.expires_at_ms
	//   - allowed_protocols subset of parent.allowed_protocols

	const childSpendCap = parent.spendCap / 2n; // half the parent cap
	const childDailyLimit = parent.dailyLimit / 2n;
	const childExpiry = parent.expiresAtMs; // same expiry

	const delegateTx = new Transaction();
	const childObj = delegateTx.add(
		client.movegate.tx.delegateMandate({
			parentMandateId,
			agent: address, // self-delegation for demo
			spendCap: childSpendCap,
			dailyLimit: childDailyLimit,
			allowedProtocols: parent.allowedProtocols,
			expiresAtMs: childExpiry,
		}),
	);

	// Transfer the child mandate to the agent
	delegateTx.transferObjects([childObj], address);

	await execute(delegateTx, '2. Delegate child mandate');

	// Find the new child mandate by querying owned mandates
	const ownedMandates = await client.movegate.getMandatesByOwner(address);
	const child = ownedMandates.find(
		(m) => m.parentMandateId === parentMandateId && !m.revoked,
	);

	if (!child) throw new Error('Child mandate not found');

	console.log('\n--- Child Mandate ---');
	console.log(`  ID:             ${child.id}`);
	console.log(`  Parent:         ${child.parentMandateId}`);
	console.log(`  Spend cap:      ${child.spendCap} MIST (parent: ${parent.spendCap})`);
	console.log(`  Daily limit:    ${child.dailyLimit} MIST (parent: ${parent.dailyLimit})`);
	console.log(`  Depth:          ${child.currentDepth}`);

	// -----------------------------------------------------------------------
	// 3. Authorize through the child mandate
	// -----------------------------------------------------------------------

	const authTx = new Transaction();
	authTx.add(
		client.movegate.tx.authorizeAndReceipt({
			mandateId: child.id,
			passportId,
			protocol: parent.allowedProtocols[0],
			amount: 50_000_000n, // 0.05 SUI
			actionType: parent.allowedActions[0],
			coinType: '0x2::sui::SUI',
			owner: address,
			success: true,
			chainDepth: child.currentDepth,
		}),
	);

	await execute(authTx, '3. Authorize action through child mandate');

	const updatedChild = await client.movegate.getMandate(child.id);
	console.log(`    Actions: ${updatedChild.totalActions}`);
	console.log(`    Volume:  ${updatedChild.totalVolume} MIST`);

	console.log('\n=== Delegation Flow Complete ===');
}

main().catch((err) => {
	console.error('\nFailed:', err.message);
	process.exit(1);
});
