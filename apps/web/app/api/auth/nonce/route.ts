import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash, newNonce } from "@/lib/security";
import { nonceSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const parsed = nonceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  const nonce = newNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.authNonce.create({ data: { address: parsed.data.address.toLowerCase(), nonceHash: hash(nonce), expiresAt } });
  const domain = request.nextUrl.host;
  const message = `${domain} wants you to sign in to ProofPass Rescue.\n\nAddress: ${parsed.data.address}\nChain ID: 10143\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}\n\nThis request does not initiate a blockchain transaction.`;
  return NextResponse.json({ nonce, message, expiresAt });
}
