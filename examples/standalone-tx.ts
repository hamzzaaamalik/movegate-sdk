/**
 * MoveGate SDK -- Standalone Transaction Builders
 *
 * Demonstrates using the SDK's transaction builder functions directly,
 * WITHOUT the $extend pattern. This is useful when you need fine-grained
 * control over transaction composition or want to integrate MoveGate
 * into an existing transaction pipeline.
 *
 * The exported functions (registerAgent, createMandate, authorizeAndReceipt,
 * etc.) each return a thunk: `(tx: Transaction) => void`. Pass them to
 * `tx.add()` or call them directly.
 *
 * Prerequisites:
 *   npm install @movegate/sdk @mysten/sui
 *
 * Run:
 *   PRIVATE_KEY=suiprivkey1... npx tsx examples/standalone-tx.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
	registerAgent,
	createMandate,
	getNetworkConfig,
	targets,
} from '../src/index.js';

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
const config = getNetworkConfig('testnet');

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});

// ---------------------------------------------------------------------------
// Example 1: Compose multiple operations in a single PTB
// ---------------------------------------------------------------------------

async function composeTransaction() {
	console.log('=== Standalone TX Builders ===');
	console.log(`Signer: ${address}\n`);

	const tx = new Transaction();
	tx.setSender(address);

	// Operation 1: Register agent (idempotent)
	const registerThunk = registerAgent(config);
	registerThunk(tx);

	// You can also use tx.add() which calls the thunk for you:
	// tx.add(registerAgent(config));

	console.log(`Commands in PTB: ${tx.getData().commands.length}`);
	console.log('  [0] registerAgent (moveCall)');

	// Sign and execute
	const result = await client.signAndExecuteTransaction({
		transaction: tx,
		signer: keypair,
	});

	if (result.$kind === 'FailedTransaction') {
		throw new Error('Transaction failed');
	}

	console.log(`Digest: ${result.Transaction.digest}`);
	console.log(`Status: ${result.Transaction.status.success ? 'success' : 'failed'}`);
}

// ---------------------------------------------------------------------------
// Example 2: Use targets() for raw moveCall access
// ---------------------------------------------------------------------------

function showTargets() {
	console.log('\n=== Move Call Targets ===');

	const t = targets(config);

	console.log('Passport:');
	console.log(`  register:    ${t.registerAgent}`);
	console.log(`  set_tier:    ${t.setVerificationTier}`);

	console.log('Mandate:');
	console.log(`  create:      ${t.createMandate}`);
	console.log(`  authorize:   ${t.authorizeAction}`);
	console.log(`  consume:     ${t.consumeAuthToken}`);
	console.log(`  revoke:      ${t.revokeMandate}`);
	console.log(`  delegate:    ${t.delegateMandate}`);

	console.log('Receipt:');
	console.log(`  success:     ${t.createSuccessReceipt}`);
	console.log(`  failure:     ${t.createFailureReceipt}`);

	console.log('Treasury:');
	console.log(`  withdraw:    ${t.withdraw}`);
	console.log(`  update_bps:  ${t.updateAuthFeeBps}`);
	console.log(`  update_fee:  ${t.updateCreationFee}`);
	console.log(`  calc_fee:    ${t.calculateAuthFee}`);
}

// ---------------------------------------------------------------------------
// Example 3: Build a complex multi-step PTB manually
// ---------------------------------------------------------------------------

function buildComplexPtb() {
	console.log('\n=== Complex PTB (dry build) ===');

	const DUMMY_PASSPORT = '0x0000000000000000000000000000000000000000000000000000000000000001';

	const tx = new Transaction();

	// Step 1: Register agent
	tx.add(registerAgent(config));

	// Step 2: Create mandate and capture the returned object
	const mandateObj = tx.add(
		createMandate(config, {
			passportId: DUMMY_PASSPORT,
			agent: address,
			spendCap: 1_000_000_000n,
			dailyLimit: 5_000_000_000n,
			allowedProtocols: [address],
			allowedCoinTypes: [],
			allowedActions: [1],
			expiresAtMs: BigInt(Date.now() + 86_400_000),
			minAgentScore: null,
			paymentAmount: 10_000_000n,
		}),
	);

	// Step 3: Transfer mandate to self
	tx.transferObjects([mandateObj], address);

	const commands = tx.getData().commands;
	console.log(`Total commands: ${commands.length}`);
	for (let i = 0; i < commands.length; i++) {
		const cmd = commands[i];
		console.log(`  [${i}] ${cmd.$kind}`);
	}
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
	await composeTransaction();
	showTargets();
	buildComplexPtb();
}

main().catch((err) => {
	console.error('Failed:', err.message);
	process.exit(1);
});
