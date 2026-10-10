import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, keccak256, stringToHex } from "viem";
import { prisma } from "@/lib/prisma";
import { monadTestnet } from "@/lib/chain";
import { requireSession } from "@/lib/security";
import { batchSchema } from "@/lib/validation";
import { z } from "zod";

const storedBatch = batchSchema.safeExtend({ transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = storedBatch.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid batch data.", issues: parsed.error.flatten() }, { status: 400 });
    const organization = await prisma.organization.findFirst({ where: { walletAddress: session.address, type: "CANTEEN", approvalStatus: "APPROVED" } });
    if (!organization) return NextResponse.json({ error: "An approved canteen wallet is required." }, { status: 403 });
    const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0]) });
    const receipt = await client.getTransactionReceipt({ hash: parsed.data.transactionHash as `0x${string}` });
    if (receipt.status !== "success" || receipt.from.toLowerCase() !== session.address) return NextResponse.json({ error: "The confirmed transaction does not match this wallet." }, { status: 400 });
    await prisma.batchPrivate.create({ data: {
      id: keccak256(stringToHex(parsed.data.id)), canteenId: organization.id, pickupInstructions: parsed.data.pickupInstructions,
      publicDescription: parsed.data.description, transactionHash: parsed.data.transactionHash, confirmedBlock: receipt.blockNumber,
    }});
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Sign in with your wallet first." }, { status: 401 });
    throw error;
  }
}
