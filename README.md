<div align="center">

# @movegate/sdk

**Build trustless AI agents on Sui.**

TypeScript SDK for [MoveGate Protocol](https://github.com/hamzzaaamalik/movegate-contracts). Agent Identity, Authorization & Trust Infrastructure.

[![npm](https://img.shields.io/npm/v/@movegate/sdk?style=flat-square&color=blue)](https://www.npmjs.com/package/@movegate/sdk)
[![build](https://img.shields.io/github/actions/workflow/status/hamzzaaamalik/movegate-sdk/ci.yml?style=flat-square)](https://github.com/hamzzaaamalik/movegate-sdk/actions)
[![license](https://img.shields.io/npm/l/@movegate/sdk?style=flat-square)](https://github.com/hamzzaaamalik/movegate-sdk/blob/main/LICENSE)
[![downloads](https://img.shields.io/npm/dm/@movegate/sdk?style=flat-square)](https://www.npmjs.com/package/@movegate/sdk)

[Website](https://movegate.xyz) · [Smart Contracts](https://github.com/hamzzaaamalik/movegate-contracts) · [npm](https://www.npmjs.com/package/@movegate/sdk)

</div>

---

## Why MoveGate?

AI agents need to act on-chain. They swap tokens, manage positions and execute strategies. But giving an agent your private key is a **single point of failure**.

MoveGate solves this with **Mandates**: granular, time-bound, revocable permissions that let agents act *on your behalf* without ever holding your keys.

**What you can build:**

- **AI Trading Agents** that swap up to 5 SUI/day on specific DEXes
- **DAO Treasury Managers** with hierarchical spending limits
- **DeFi Automation Bots** with per-protocol caps on yield farming
- **Multi-Agent Systems** with chained mandate delegation

Every action is authorized on-chain, scored for reputation and recorded as an immutable receipt.

## Install

```bash
npm install @movegate/sdk @mysten/sui
```

> Requires `@mysten/sui` v2.x as a peer dependency.

## Quick Start

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { movegate } from '@movegate/sdk';

// Connect to Sui with MoveGate
const client = new SuiGrpcClient({ network: 'testnet' })
  .$extend(movegate({ network: 'testnet' }));

// Query protocol state
const registry = await client.movegate.getAgentRegistry();
console.log(`${registry.totalRegistered} agents registered`);

// Check agent reputation
const passport = await client.movegate.getPassport('0x...');
console.log(`Score: ${passport.reputationScore}, Tier: ${passport.verificationTier}`);

// Read mandate permissions
const mandate = await client.movegate.getMandate('0x...');
console.log(`Spend cap: ${mandate.spendCap}, Revoked: ${mandate.revoked}`);
```

## Core Concepts

| Concept | Description |
|---|---|
| **Passport** | On-chain identity for an agent. Tracks reputation, actions and verification tier |
| **Mandate** | Permission grant from user to agent. Bounded by amount, time, protocols and action types |
| **AuthToken** | Zero-ability hot potato. Authorizes a single action and *must* be consumed in the same transaction |
| **Receipt** | Immutable on-chain record of every action. Frozen forever as an audit trail |
| **Treasury** | Protocol fee collection with admin-controlled parameters |

## Full Authorization Flow

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// 1. Register agent (free, idempotent)
tx.add(client.movegate.tx.registerAgent());

// 2. Create mandate with bounded permissions
const mandate = tx.add(client.movegate.tx.createMandate({
  passportId: '0x...',
  agent: '0xAgentAddress',
  spendCap: 1_000_000_000n,        // 1 SUI max per action
  dailyLimit: 5_000_000_000n,      // 5 SUI per epoch
  allowedProtocols: ['0xDEX...'],  // only these protocols
  allowedCoinTypes: [],            // any coin type
  allowedActions: [1, 2],          // specific action codes
  expiresAtMs: BigInt(Date.now() + 30 * 86_400_000), // 30 days
  minAgentScore: 500n,             // minimum reputation
  paymentAmount: 10_000_000n,      // creation fee
}));
tx.transferObjects([mandate], ownerAddress);

// 3. Authorize action + create receipt (hot-potato in single PTB)
tx.add(client.movegate.tx.authorizeAndReceipt({
  mandateId: '0x...',
  passportId: '0x...',
  protocol: '0xDEX...',
  amount: 100_000_000n,
  actionType: 1,
  coinType: '0x2::sui::SUI',
  owner: '0x...',
  success: true,
}));

// 4. Revoke anytime
tx.add(client.movegate.tx.revokeMandate({
  mandateId: '0x...',
  passportId: '0x...',
  reason: 0,
}));
```

## API Reference

### Queries

```typescript
// Passport
const passport = await client.movegate.getPassport(passportId);
const registry = await client.movegate.getAgentRegistry();
const has      = await client.movegate.hasPassport(agentAddress);
const id       = await client.movegate.getPassportIdByAgent(agentAddress);

// Mandate
const mandate  = await client.movegate.getMandate(mandateId);
const registry = await client.movegate.getMandateRegistry();
const mandates = await client.movegate.getMandatesByOwner(ownerAddress);

// Treasury
const fees     = await client.movegate.getFeeConfig();
const treasury = await client.movegate.getTreasuryBalance();

// Events
const type = client.movegate.getEventType('MandateCreated');
```

### Transaction Builders

All builders return composable thunks for `tx.add()`.

| Builder | Returns | Description |
|---|---|---|
| `tx.registerAgent()` | `void` | Create passport. Free and idempotent |
| `tx.createMandate(params)` | `Mandate` | Grant bounded permissions to agent |
| `tx.authorizeAndReceipt(params)` | `void` | Full hot-potato auth flow in one PTB |
| `tx.revokeMandate(params)` | `void` | Permanently revoke a mandate |
| `tx.delegateMandate(params)` | `Mandate` | Create child mandate with tighter limits |

### Admin Operations

Require `AdminCap` created at deploy and held by protocol owner.

```typescript
tx.add(client.movegate.admin.withdraw(adminCapId, recipient));
tx.add(client.movegate.admin.updateAuthFeeBps(adminCapId, 50n));       // 0.5%
tx.add(client.movegate.admin.updateCreationFee(adminCapId, 5_000_000n));
tx.add(client.movegate.admin.setVerificationTier(adminCapId, passportId, 2));
```

### Events

11 event types for indexing and real-time tracking:

| Event | Emitted when |
|---|---|
| `PassportCreated` | Agent registers |
| `ScoreUpdated` | Reputation recalculated |
| `VerificationTierChanged` | Admin changes tier |
| `MandateCreated` | New mandate granted |
| `MandateRevoked` | Mandate revoked |
| `MandateDelegated` | Child mandate created |
| `ActionAuthorized` | Action passes 9-check auth |
| `ReceiptCreated` | Receipt frozen on-chain |
| `FeeCollected` | Fee collected |
| `TreasuryWithdrawal` | Admin withdrawal |
| `FeeConfigUpdated` | Fee params changed |

```typescript
import { parseEventsFromTx, MandateCreatedEvent } from '@movegate/sdk';

const events = parseEventsFromTx<MandateCreatedEvent>(
  txResult.events, config, 'MandateCreated'
);
```

### Standalone Usage

Skip `$extend` and import builders directly:

```typescript
import { registerAgent, createMandate, getNetworkConfig } from '@movegate/sdk';

const config = getNetworkConfig('testnet');
const tx = new Transaction();

tx.add(registerAgent(config));
const mandate = tx.add(createMandate(config, { ... }));
tx.transferObjects([mandate], owner);
```

## How Authorization Works

Every `authorizeAndReceipt()` call performs **9 on-chain checks** before any state mutation:

1. Mandate not revoked
2. Mandate not expired
3. Agent address matches
4. Protocol whitelisted
5. Coin type allowed
6. Action type allowed
7. Amount ≤ spend cap
8. Amount + spent ≤ daily limit (resets per epoch)
9. Agent score ≥ minimum (if configured)

The `AuthToken` produced has **zero Move abilities**. It cannot be stored, copied or dropped. It must be consumed in the same PTB. The SDK handles this automatically.

## Mandate Delegation

Mandates support hierarchical delegation for multi-agent architectures:

```typescript
const child = tx.add(client.movegate.tx.delegateMandate({
  parentMandateId: '0x...',
  agent: '0xSubAgent',
  spendCap: 500_000_000n,          // must be <= parent
  dailyLimit: 2_000_000_000n,      // must be <= parent
  allowedProtocols: ['0xDEX...'],  // must be subset of parent
  expiresAtMs: parentExpiry,       // must be <= parent
}));
tx.transferObjects([child], subAgentOwner);
```

## Examples

| Example | Description |
|---|---|
| [quickstart.ts](examples/quickstart.ts) | Connect and read protocol state |
| [full-flow.ts](examples/full-flow.ts) | Register → Mandate → Authorize → Revoke |
| [standalone-tx.ts](examples/standalone-tx.ts) | Direct builders without `$extend` |
| [delegation.ts](examples/delegation.ts) | Hierarchical mandate delegation |
| [admin.ts](examples/admin.ts) | AdminCap operations |

```bash
# Read-only (no key required)
npx tsx examples/quickstart.ts

# Full flow (requires funded testnet key)
PRIVATE_KEY=suiprivkey1... npx tsx examples/full-flow.ts
```

## Network Configuration

Pre-configured for testnet and mainnet with all shared object IDs:

```typescript
import { getNetworkConfig, TESTNET, targets } from '@movegate/sdk';

const config = getNetworkConfig('testnet');
// config.packageId, config.agentRegistry, config.mandateRegistry,
// config.feeConfig, config.protocolTreasury

const t = targets(config);
// t.registerAgent, t.createMandate, t.authorizeAction, ...
```

<details>
<summary><strong>Type Reference</strong></summary>

### AgentPassport (20 fields)

```typescript
interface AgentPassport {
  id: string;
  agent: string;
  registeredAtMs: bigint;
  registeredAtEpoch: bigint;
  totalActions: bigint;
  successfulActions: bigint;
  failedActions: bigint;
  totalVolumeMist: bigint;
  uniqueUsers: bigint;
  uniqueProtocols: bigint;
  revocationsReceived: bigint;
  consecutiveSuccesses: bigint;
  lastActionEpoch: bigint;
  activeMandateCount: bigint;
  reputationScore: bigint;
  lastScoreUpdateEpoch: bigint;
  verificationTier: number;
  verified: boolean;
  verifiedAtMs: bigint | null;
  topProtocols: string[];
}
```

### Mandate (22 fields)

```typescript
interface Mandate {
  id: string;
  owner: string;
  agent: string;
  spendCap: bigint;
  dailyLimit: bigint;
  spentThisEpoch: bigint;
  lastResetEpoch: bigint;
  allowedProtocols: string[];
  allowedCoinTypes: string[];
  allowedActions: number[];
  createdAtMs: bigint;
  expiresAtMs: bigint;
  revoked: boolean;
  revokedAtMs: bigint | null;
  revokeReason: number | null;
  totalActions: bigint;
  successfulActions: bigint;
  totalVolume: bigint;
  parentMandateId: string | null;
  maxDelegationDepth: number;
  currentDepth: number;
  minAgentScore: bigint | null;
}
```

### ActionReceipt (15 fields)

```typescript
interface ActionReceipt {
  id: string;
  mandateId: string;
  agent: string;
  owner: string;
  protocol: string;
  coinType: string;
  amount: bigint;
  actionType: number;
  epoch: bigint;
  timestampMs: bigint;
  success: boolean;
  failureCode: bigint | null;
  chainDepth: number;
  parentReceiptId: string | null;
  agentScoreAtTime: bigint;
}
```

### FeeConfig & ProtocolTreasuryData

```typescript
interface FeeConfig {
  id: string;
  creationFee: bigint;
  authFeeBps: bigint;
  maxFeeBps: bigint;
}

interface ProtocolTreasuryData {
  id: string;
  balance: bigint;
  totalCollected: bigint;
  totalWithdrawn: bigint;
}
```

### Registry Types

```typescript
interface AgentRegistryData {
  id: string;
  totalRegistered: bigint;
  totalActionsAllTime: bigint;
  totalVolumeAllTime: bigint;
}

interface MandateRegistryData {
  id: string;
  totalMandatesCreated: bigint;
  totalMandatesActive: bigint;
  totalMandatesRevoked: bigint;
}
```

</details>

## Development

```bash
npm install
npm run build       # tsup → dist/
npm test            # vitest (37 tests with live testnet integration)
npm run lint        # prettier check
npm run format      # prettier write
```

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
