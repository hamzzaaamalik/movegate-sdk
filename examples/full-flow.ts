/**
 * MoveGate SDK -- Full Authorization Flow
 *
 * Demonstrates the complete lifecycle of the MoveGate protocol:
 *
 *   1. Register an agent (creates a passport)
 *   2. Create a mandate (owner grants agent bounded permissions)
 *   3. Authorize an action + create a receipt (hot-potato pattern)
 *   4. Revoke the mandate
 *
 * Each step builds a Programmable Transaction Block (PTB) using the SDK's
 * transaction thunks, then signs and executes it on-chain.
 *
 * Prerequisites:
 *   npm install @movegate/sdk @mysten/sui
 *
 * Run:
 *   PRIVATE_KEY=suiprivkey1... npx tsx examples/full-flow.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { movegate } from '../src/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
	console.error('Set PRIVATE_KEY env var to a Sui private key (suiprivkey1...)');
	process.exit(1);
}

const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const address = keypair.toSuiAddress();

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(movegate({ network: 'testnet' }));

// ---------------------------------------------------------------------------
// Helper: sign, execute, and wait for confirmation
// ---------------------------------------------------------------------------

async function execute(tx: Transaction, description: string) {
	tx.setSender(address);

	console.log(`\n>>> ${description}`);

	const result = await client.signAndExecuteTransaction({
		transaction: tx,
		signer: keypair,
	});

	if (result.$kind === 'FailedTransaction') {
		const error = result.FailedTransaction.status?.error ?? 'unknown error';
		throw new Error(`Transaction failed: ${error}`);
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
// Main flow
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== MoveGate Full Authorization Flow ===');
	console.log(`Signer: ${address}`);

	// -----------------------------------------------------------------------
	// Step 1: Register as an agent
	// -----------------------------------------------------------------------
	// Calling register_agent is free and idempotent. If a passport already
	// exists for this address, the call succeeds without creating a duplicate.

	const registerTx = new Transaction();
	registerTx.add(client.movegate.tx.registerAgent());
	await execute(registerTx, 'Step 1: Register agent (create passport)');

	// Verify the passport was created
	const passportId = await client.movegate.getPassportIdByAgent(address);
	if (!passportId) throw new Error('Passport not found after registration');
	console.log(`    Passport: ${passportId}`);

	const passport = await client.movegate.getPassport(passportId);
	console.log(`    Score: ${passport.reputationScore}, Tier: ${passport.verificationTier}`);

	// -----------------------------------------------------------------------
	// Step 2: Create a mandate
	// -----------------------------------------------------------------------
	// The mandate owner (signer) grants the agent (also signer in this demo)
	// bounded permissions: a spend cap, daily limit, protocol whitelist,
	// allowed action types, and an expiry.
	//
	// Creation requires paying the protocol fee (fetched from on-chain config).

	const feeConfig = await client.movegate.getFeeConfig();

	const THIRTY_DAYS_MS = BigInt(30 * 24 * 60 * 60 * 1000);
	const expiresAt = BigInt(Date.now()) + THIRTY_DAYS_MS;

	const mandateTx = new Transaction();
	const mandateObj = mandateTx.add(
		client.movegate.tx.createMandate({
			passportId,
			agent: address,
			spendCap: 1_000_000_000n, // 1 SUI
			dailyLimit: 5_000_000_000n, // 5 SUI per epoch
			allowedProtocols: [address], // self-protocol for demo
			allowedCoinTypes: [],
			allowedActions: [1, 2], // action types 1 and 2
			expiresAtMs: expiresAt,
			minAgentScore: null, // no minimum score requirement
			paymentAmount: feeConfig.creationFee,
		}),
	);

	// Transfer the mandate to the signer (owner keeps it)
	mandateTx.transferObjects([mandateObj], address);

	await execute(mandateTx, 'Step 2: Create mandate');

	// Find the newly created mandate by querying owned objects
	const mandates = await client.movegate.getMandatesByOwner(address);
	const newMandate = mandates.find((m) => !m.revoked && m.expiresAtMs === expiresAt);
	if (!newMandate) throw new Error('Created mandate not found');
	const mandateId = newMandate.id;

	console.log(`    Mandate: ${mandateId}`);
	console.log(`    Spend cap: ${newMandate.spendCap} MIST`);
	console.log(`    Daily limit: ${newMandate.dailyLimit} MIST`);
	console.log(`    Expires: ${new Date(Number(newMandate.expiresAtMs)).toISOString()}`);

	// -----------------------------------------------------------------------
	// Step 3: Authorize an action + create receipt (hot-potato flow)
	// -----------------------------------------------------------------------
	// This is the core of the MoveGate protocol. A single PTB:
	//
	//   1. authorize_action<SUI>  -> produces an AuthToken (zero abilities)
	//   2. create_success_receipt -> consumes the AuthToken, freezes a receipt
	//
	// The AuthToken has NO Move abilities (no copy, drop, store, key).
	// It MUST be consumed within the same transaction. The Move type system
	// enforces this at compile time. There is no way to smuggle it out.

	const authTx = new Transaction();
	authTx.add(
		client.movegate.tx.authorizeAndReceipt({
			mandateId,
			passportId,
			protocol: address,
			amount: 100_000_000n, // 0.1 SUI
			actionType: 1,
			coinType: '0x2::sui::SUI',
			owner: address,
			success: true,
		}),
	);

	await execute(authTx, 'Step 3: Authorize action + create receipt');

	// Verify the mandate was updated
	const updatedMandate = await client.movegate.getMandate(mandateId);
	console.log(`    Total actions: ${updatedMandate.totalActions}`);
	console.log(`    Successful: ${updatedMandate.successfulActions}`);
	console.log(`    Volume: ${updatedMandate.totalVolume} MIST`);

	// Verify the passport score was updated
	const updatedPassport = await client.movegate.getPassport(passportId);
	console.log(`    Agent score: ${updatedPassport.reputationScore}`);

	// -----------------------------------------------------------------------
	// Step 4: Revoke the mandate
	// -----------------------------------------------------------------------
	// Only the mandate owner can revoke. Revocation is permanent.
	// Reason codes: 0 = owner decision, 1 = security, 2 = expired, 3 = other

	const revokeTx = new Transaction();
	revokeTx.add(
		client.movegate.tx.revokeMandate({
			mandateId,
			passportId,
			reason: 0, // owner decision
		}),
	);

	await execute(revokeTx, 'Step 4: Revoke mandate');

	const revokedMandate = await client.movegate.getMandate(mandateId);
	console.log(`    Revoked: ${revokedMandate.revoked}`);
	if (revokedMandate.revokedAtMs !== null) {
		console.log(`    Revoked at: ${new Date(Number(revokedMandate.revokedAtMs)).toISOString()}`);
	}

	// -----------------------------------------------------------------------
	// Summary
	// -----------------------------------------------------------------------

	console.log('\n=== Flow Complete ===');
	console.log(`  Passport:  ${passportId}`);
	console.log(`  Mandate:   ${mandateId} (revoked)`);
	console.log(`  Actions:   ${updatedMandate.totalActions}`);
	console.log(`  Volume:    ${updatedMandate.totalVolume} MIST`);
}

main().catch((err) => {
	console.error('\nFailed:', err.message);
	process.exit(1);
});
