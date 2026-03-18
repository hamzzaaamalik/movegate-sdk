/**
 * MoveGate SDK -- Admin Operations
 *
 * Demonstrates protocol administration functions that require an AdminCap:
 *
 *   1. Update the mandate creation fee
 *   2. Update the authorization fee (basis points)
 *   3. Set an agent's verification tier
 *   4. Withdraw accumulated fees from the treasury
 *
 * The AdminCap is a Move object created during contract deployment and
 * transferred to the deployer. Only the holder of the AdminCap can
 * execute these operations.
 *
 * Prerequisites:
 *   npm install @movegate/sdk @mysten/sui
 *
 * Run:
 *   PRIVATE_KEY=suiprivkey1... ADMIN_CAP=0x... npx tsx examples/admin.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { movegate } from '../src/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ADMIN_CAP = process.env.ADMIN_CAP;

if (!PRIVATE_KEY || !ADMIN_CAP) {
	console.error('Required env vars:');
	console.error('  PRIVATE_KEY=suiprivkey1...  (deployer private key)');
	console.error('  ADMIN_CAP=0x...             (AdminCap object ID)');
	process.exit(1);
}

const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const address = keypair.toSuiAddress();
const adminCap: string = ADMIN_CAP;

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
// Admin operations
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== MoveGate Admin Operations ===');
	console.log(`Admin: ${address}`);
	console.log(`AdminCap: ${adminCap}`);

	// Show current state before changes
	const currentFees = await client.movegate.getFeeConfig();
	const currentTreasury = await client.movegate.getTreasuryBalance();

	console.log('\n--- Current Configuration ---');
	console.log(`  Creation fee: ${currentFees.creationFee} MIST (${Number(currentFees.creationFee) / 1e9} SUI)`);
	console.log(`  Auth fee:     ${currentFees.authFeeBps} bps (${Number(currentFees.authFeeBps) / 100}%)`);
	console.log(`  Max fee cap:  ${currentFees.maxFeeBps} bps`);
	console.log(`  Treasury:     ${currentTreasury.balance} MIST`);

	// -----------------------------------------------------------------------
	// 1. Update the mandate creation fee
	// -----------------------------------------------------------------------
	// The creation fee is charged in MIST when a new mandate is created.
	// Setting it to 0.02 SUI (20,000,000 MIST):

	const updateFeeTx = new Transaction();
	updateFeeTx.add(client.movegate.admin.updateCreationFee(adminCap, 20_000_000n));
	await execute(updateFeeTx, '1. Update creation fee to 0.02 SUI');

	// -----------------------------------------------------------------------
	// 2. Update the authorization fee (basis points)
	// -----------------------------------------------------------------------
	// The auth fee is taken as a percentage of the authorized amount.
	// 1 bps = 0.01%. Setting to 5 bps = 0.05%.
	// Cannot exceed maxFeeBps (500 = 5%).

	const updateBpsTx = new Transaction();
	updateBpsTx.add(client.movegate.admin.updateAuthFeeBps(adminCap, 5n));
	await execute(updateBpsTx, '2. Update auth fee to 5 bps (0.05%)');

	// -----------------------------------------------------------------------
	// 3. Set an agent's verification tier
	// -----------------------------------------------------------------------
	// Verification tiers: 0 = unverified, 1 = basic, 2 = advanced, 3 = premium
	// Setting tier >= 1 marks the passport as "verified".
	// This is typically done after off-chain KYC or reputation checks.

	const agentPassport = process.env.AGENT_PASSPORT;
	if (agentPassport) {
		const tierTx = new Transaction();
		tierTx.add(client.movegate.admin.setVerificationTier(adminCap, agentPassport, 2));
		await execute(tierTx, '3. Set verification tier to 2 (advanced)');
	} else {
		console.log('\n>>> 3. Skipped: Set AGENT_PASSPORT env var to upgrade a passport');
	}

	// -----------------------------------------------------------------------
	// 4. Withdraw accumulated fees from treasury
	// -----------------------------------------------------------------------
	// Sends all accumulated SUI from the ProtocolTreasury to the recipient.
	// Only works if treasury balance > 0.

	const treasury = await client.movegate.getTreasuryBalance();
	if (treasury.balance > 0n) {
		const withdrawTx = new Transaction();
		withdrawTx.add(client.movegate.admin.withdraw(adminCap, address));
		await execute(withdrawTx, '4. Withdraw treasury fees');
	} else {
		console.log('\n>>> 4. Skipped: Treasury balance is 0');
	}

	// -----------------------------------------------------------------------
	// Verify final state
	// -----------------------------------------------------------------------

	const finalFees = await client.movegate.getFeeConfig();
	const finalTreasury = await client.movegate.getTreasuryBalance();

	console.log('\n--- Updated Configuration ---');
	console.log(`  Creation fee: ${finalFees.creationFee} MIST (${Number(finalFees.creationFee) / 1e9} SUI)`);
	console.log(`  Auth fee:     ${finalFees.authFeeBps} bps (${Number(finalFees.authFeeBps) / 100}%)`);
	console.log(`  Treasury:     ${finalTreasury.balance} MIST`);
}

main().catch((err) => {
	console.error('\nFailed:', err.message);
	process.exit(1);
});
