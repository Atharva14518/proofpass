import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { createPublicClient, http } from "viem";
import { monadTestnet, proofPassAbi } from "../lib/chain";

const configuredAddress = process.env.CONTRACT_ADDRESS as `0x${string}` | undefined;
const connectionString = process.env.DATABASE_URL;
if (!configuredAddress) throw new Error("CONTRACT_ADDRESS is required");
if (!connectionString) throw new Error("DATABASE_URL is required");
const address: `0x${string}` = configuredAddress;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0]) });
const checkpointId = `${monadTestnet.id}:${address.toLowerCase()}`;
const serialise = (value: unknown): unknown => typeof value === "bigint" ? value.toString() : Array.isArray(value) ? value.map(serialise) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,serialise(v)])) : value;

async function indexOnce() {
  const head = await client.getBlockNumber();
  const safeHead = head > 4n ? head - 4n : 0n;
  const checkpoint = await prisma.indexerCheckpoint.findUnique({ where: { id: checkpointId } });
  const fromBlock = checkpoint ? checkpoint.lastBlock + 1n : safeHead > 5_000n ? safeHead - 5_000n : 0n;
  if (fromBlock > safeHead) return;
  const logs = await client.getContractEvents({ address, abi: proofPassAbi, fromBlock, toBlock: safeHead });
  for (const log of logs) {
    const args = "args" in log ? serialise(log.args) : {};
    const deliveryId = args && typeof args === "object" && "id" in args ? String(args.id) : null;
    await prisma.chainEvent.upsert({
      where: { chainId_transactionHash_logIndex: { chainId: monadTestnet.id, transactionHash: log.transactionHash, logIndex: log.logIndex } },
      update: {},
      create: { id: `${monadTestnet.id}:${log.transactionHash}:${log.logIndex}`, chainId: monadTestnet.id, contractAddress: address.toLowerCase(), blockNumber: log.blockNumber, transactionHash: log.transactionHash, logIndex: log.logIndex, eventName: log.eventName, deliveryId, payload: args as object },
    });
  }
  await prisma.indexerCheckpoint.upsert({ where: { id: checkpointId }, update: { lastBlock: safeHead }, create: { id: checkpointId, chainId: monadTestnet.id, contractAddress: address.toLowerCase(), lastBlock: safeHead } });
  console.log(`Indexed ${logs.length} event(s) through block ${safeHead}.`);
}
indexOnce().finally(() => prisma.$disconnect());
