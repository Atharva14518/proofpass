# ProofPass Rescue

> Verifiable food-rescue handoffs with transparent transport reimbursement on Monad Testnet.

[![Network](https://img.shields.io/badge/network-Monad_Testnet-836EF9)](https://testnet.monadvision.com/address/0x4A03ee691016D8a2c5FD20111C9aB543dE39B069)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)](https://soliditylang.org/)
[![Tests](https://img.shields.io/badge/contract_tests-7_passing-2ea44f)](#testing)

ProofPass Rescue coordinates surplus-food delivery between canteens, sponsors, volunteers, and NGOs. A canteen declares a delivery, a sponsor escrows the exact transport reimbursement, an assigned volunteer confirms pickup, and the receiving NGO records the quantity received. Matching delivery settles the reimbursement; a mismatch blocks normal settlement and opens a transparent dispute path.

The project is a testnet pilot. It does **not** claim that a blockchain independently proves physical delivery, food quality, food safety, or the real-world identity of a wallet holder. It proves which wallet submitted each protocol action, when it happened, and how escrow was accounted for.

## Why it is different

Most food-rescue products focus on surplus discovery, consumer discounts, community sharing, or volunteer routing. ProofPass is the accountability and settlement layer between organizations that may not share a trusted database.

- **Multi-party confirmation:** a canteen, volunteer, and NGO cannot silently act as one another.
- **Programmable escrow:** transport funding is committed before pickup and credited only after the delivery workflow succeeds.
- **Quantity-aware disputes:** a declared/received mismatch locks normal settlement for resolver review.
- **Public verification:** a batch ID or QR code exposes a non-sensitive on-chain trail without requiring a wallet.
- **Privacy by design:** contact information and pickup instructions stay off-chain; QR codes never contain them.
- **Recoverable failure paths:** expired unfunded batches can be cancelled, and funded-but-uncollected batches can be refunded.

## Live contract

| Setting | Value |
| --- | --- |
| Network | Monad Testnet |
| Chain ID | `10143` |
| Currency | `MON` |
| Contract | [`0x4A03ee691016D8a2c5FD20111C9aB543dE39B069`](https://testnet.monadvision.com/address/0x4A03ee691016D8a2c5FD20111C9aB543dE39B069) |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadvision.com` |
| Faucet | `https://faucet.monad.xyz` |

## Protocol workflow

```text
Canteen creates terms
        ↓
Sponsor funds exact reimbursement
        ↓
Assigned volunteer confirms pickup
        ↓
Receiving NGO confirms actual quantity
        ↓
Matching quantity ──→ settle ──→ volunteer withdraws
Different quantity ─→ dispute ──→ resolver allocates escrow
```

| Current state | Action | Authorized caller | Next state |
| --- | --- | --- | --- |
| `UNKNOWN` | Create valid delivery | `CANTEEN_ROLE` | `CREATED` |
| `CREATED` | Fund exact reimbursement | Any wallet | `FUNDED` |
| `CREATED` | Cancel | Canteen or admin | `CANCELLED` |
| `FUNDED` | Confirm before deadline | Assigned volunteer | `PICKED_UP` |
| `FUNDED` | Refund after missed deadline | Sponsor or resolver | `REFUNDED` |
| `PICKED_UP` | Confirm matching quantity | Assigned wallet with `NGO_ROLE` | `RECEIVED` |
| `PICKED_UP` | Confirm different quantity | Assigned wallet with `NGO_ROLE` | `DISPUTED` |
| `RECEIVED` | Settle | Any wallet | `SETTLED` |
| `DISPUTED` | Allocate escrow | `RESOLVER_ROLE` | `SETTLED` |
| `DISPUTED` after 14 days | Proportional fallback | Any wallet | `SETTLED` |

Payouts use a pull-payment pattern: settlement or refund first credits `withdrawable[address]`; the credited wallet then calls `withdraw()`. Reentrancy protection and solvency checks protect the accounting path.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/dashboard` | Role overview and clearly labelled demo preview |
| `/batches/new` | Create one batch or validate/import a CSV |
| `/batches/:id` | Live status-aware actions and public QR |
| `/verify` | Wallet-free public verification by ID |
| `/admin` | Role grants, revocations, approvals, and dispute resolution |
| `/sponsor` | Sponsor workflow preview |

The live batch page exposes only the action valid for its current state and identifies the exact wallet required for role-sensitive actions.

## Technology

- Next.js 16, React 19, TypeScript
- Wagmi 3 and Viem 2 for wallet and contract interactions
- Solidity 0.8.28, OpenZeppelin Contracts 5, Hardhat 3, Hardhat Ignition
- PostgreSQL 17, Prisma 7, `@prisma/adapter-pg`
- Zod validation, Papa Parse CSV preview, QRCode generation
- Vitest, Playwright, Node test runner, Solidity tests

## Repository structure

```text
.
├── apps/web/                 Next.js UI, API routes, Prisma schema and indexer
├── packages/contracts/       Solidity contract, Hardhat config and tests
├── storage/private/          Local private-file placeholder (contents ignored)
├── docker-compose.yml        Local PostgreSQL 17
├── .env.example              Safe configuration template
└── package.json              npm workspace commands
```

## Run locally

### 1. Prerequisites

Install:

- Node.js `22.13.0` or newer
- npm `10` or newer
- Docker Desktop with Docker Compose
- Chrome/Brave with MetaMask
- Test MON from the [Monad faucet](https://faucet.monad.xyz)

### 2. Clone and install

```bash
git clone https://github.com/Atharva14518/proofpass.git
cd proofpass
npm install
```

### 3. Configure environment

```bash
cp .env.example apps/web/.env
```

Generate a local session secret:

```bash
openssl rand -hex 32
```

Replace `SESSION_SECRET` in `apps/web/.env` with that output. The template already points to Monad Testnet and the deployed ProofPass contract.

Never commit `.env`, `.env.local`, wallet private keys, recovery phrases, or Hardhat keystores.

### 4. Start PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

### 5. Generate Prisma and initialize the database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seeded records are explicitly labelled as local demo data and are not represented as live Monad activity.

### 6. Start the web application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Wallet setup

Add or switch to Monad Testnet:

| Field | Value |
| --- | --- |
| Network name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Currency symbol | `MON` |
| Explorer | `https://testnet.monadvision.com` |

For an end-to-end demonstration, create distinct test-only accounts for:

1. Admin/Canteen
2. Volunteer
3. Receiving NGO
4. Sponsor (optional; the Canteen wallet can sponsor a demo)

Fund accounts that submit transactions with a small amount of test MON. Never reuse a wallet that holds real assets for a testnet demo.

## Demo walkthrough

1. Connect the Canteen wallet and sign the login message.
2. Open `/batches/new` and create a uniquely named batch with pickup at least one hour away.
3. Open `/batches/<exact-case-sensitive-id>` and fund the exact reimbursement.
4. Switch to the assigned Volunteer wallet and confirm pickup before the deadline.
5. Switch to the assigned NGO wallet and confirm the actual quantity.
6. If quantities match, settle the delivery.
7. Switch to the Volunteer and withdraw the reimbursement.
8. Open `/verify` in a wallet-free browser and verify the batch ID or QR link.

The intended NGO must hold `NGO_ROLE`; the Canteen must hold `CANTEEN_ROLE`. Grant roles from `/admin` using the deployment admin wallet.

## Deploy a new contract

The repository works with the existing testnet contract. To deploy your own, create and fund a **new test-only wallet**, then store deployment configuration in Hardhat's encrypted production keystore:

```bash
cd packages/contracts
npx hardhat keystore set MONAD_RPC_URL
# Enter: https://testnet-rpc.monad.xyz

npx hardhat keystore set DEPLOYER_PRIVATE_KEY
# Enter the test-only private key when prompted; never paste it into chat.

npm run deploy:monad
```

Copy the resulting public contract address into both values in `apps/web/.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT
CONTRACT_ADDRESS=0xYOUR_CONTRACT
```

Restart Next.js after changing a `NEXT_PUBLIC_` variable. The deployment account receives the default admin and resolver permissions; grant `CANTEEN_ROLE` and `NGO_ROLE` through `/admin`.

## CSV import

Required headers:

```csv
id,quantity,volunteer,receiver,pickupDeadline,deliveryDeadline,reimbursement,description
PP-2026-001,100,0x...,0x...,2026-10-11T10:00:00.000Z,2026-10-11T12:00:00.000Z,0.1,Prepared meals
```

The browser parses and validates every row, excludes invalid entries, previews issues, estimates transactions, and divides valid records into contract-bounded chunks of 25.

## Authentication and privacy

- Wallet sign-in uses a random, single-use, five-minute nonce.
- The signed message is scoped to the host, wallet, Monad chain ID, nonce, and expiry.
- Sessions use signed, HTTP-only, `SameSite=Strict` cookies.
- API authorization is verified server-side; hiding a button is never considered security.
- Public delivery state and evidence commitments go on-chain.
- Contact details, private pickup instructions, sessions, and optional private evidence remain off-chain.
- QR codes contain only a public verification URL.

## Indexer

Run the idempotent event indexer manually with:

```bash
npm run indexer
```

It waits four blocks for confirmation, resumes from a PostgreSQL checkpoint, and identifies events by `(chainId, transactionHash, logIndex)`. In production, schedule it as a supervised job or cron task.

## Testing

```bash
# Lint and type-check the web application
npm run lint
npx tsc --noEmit -p apps/web/tsconfig.json

# Smart-contract tests
npm test -w @proofpass/contracts -- --no-compile

# Web unit tests
npm test -w @proofpass/web

# Complete workspace test command
npm test

# End-to-end tests (install Chromium once)
npx playwright install chromium
npm run e2e
```

Contract tests cover the successful escrow/settlement/withdrawal path, authorization failures, exact funding, duplicates, distinct-party enforcement, quantity disputes, deadline refunds, proportional fallback, accounting invariants, and withdrawal reentrancy.

## Troubleshooting

### Wallet says Sepolia while the UI says Monad

MetaMask's token filter is not always the dapp's active provider network. Confirm the connected dapp chain is `10143`, disconnect/reconnect if necessary, and never approve a transaction showing Sepolia (`11155111`).

### `AccessControlUnauthorizedAccount`

Use the wallet assigned to the action. Canteens create; the assigned Volunteer confirms pickup; the assigned NGO must also hold `NGO_ROLE` to confirm receipt.

### `InvalidState`

Actions must follow the state machine. Fund before pickup, confirm pickup before receipt, and confirm a matching receipt before normal settlement.

### `DeadlinePassed`

Create a new batch with enough time for wallet switching and confirmations. The UI requires pickup at least one hour in the future.

### Withdrawal fails with `InvalidTerms`

The connected wallet has no credited balance, usually because settlement is incomplete or the balance was already withdrawn. The live batch page hides repeat withdrawals after payment.

## Production notes

- This project currently targets Monad **Testnet**, not mainnet.
- Use managed PostgreSQL with backups and TLS.
- Generate and rotate a strong production `SESSION_SECRET`.
- Run migrations with `prisma migrate deploy`, never `migrate dev`.
- Run the indexer as a supervised recurring process.
- Add durable private-object storage before enabling evidence uploads.
- Keep all private keys out of application hosting; browser users sign their own transactions.

## License

No open-source license has been added yet. All rights remain with the repository owner until a license is selected.
