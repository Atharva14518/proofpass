import { NextResponse } from "next/server";
import { createPublicClient, http, isHex, keccak256, stringToHex } from "viem";
import { contractAddress, monadTestnet, proofPassAbi, statusLabels } from "@/lib/chain";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!contractAddress) return NextResponse.json({ error: "Contract address is not configured.", code: "NOT_CONFIGURED" }, { status: 503 });
  const deliveryId = isHex(id, { strict: true }) && id.length === 66 ? id : keccak256(stringToHex(id));
  try {
    const client = createPublicClient({ chain: monadTestnet, transport: http(monadTestnet.rpcUrls.default.http[0], { timeout: 8_000 }) });
    const result = await client.readContract({ address: contractAddress, abi: proofPassAbi, functionName: "getDelivery", args: [deliveryId as `0x${string}`] });
    const json = Object.fromEntries(Object.entries(result).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value]));
    return NextResponse.json({ ...json, id: result.id, status: statusLabels[result.status] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC request failed";
    const unknown = /UnknownDelivery|reverted/i.test(message);
    return NextResponse.json({ error: unknown ? "No delivery exists for this ID." : "The Monad RPC could not be reached. Try again.", code: unknown ? "UNKNOWN" : "RPC_ERROR" }, { status: unknown ? 404 : 502 });
  }
}
