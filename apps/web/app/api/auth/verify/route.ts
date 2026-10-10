import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { prisma } from "@/lib/prisma";
import { hash, signSession } from "@/lib/security";
import { verifyAuthSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = verifyAuthSchema.safeParse(body);
  if (!parsed.success || typeof body?.message !== "string") return NextResponse.json({ error: "Invalid sign-in payload." }, { status: 400 });
  const record = await prisma.authNonce.findUnique({ where: { nonceHash: hash(parsed.data.nonce) } });
  const address = parsed.data.address.toLowerCase();
  const expectedMessage = record ? `${request.nextUrl.host} wants you to sign in to ProofPass Rescue.\n\nAddress: ${parsed.data.address}\nChain ID: 10143\nNonce: ${parsed.data.nonce}\nExpires: ${record.expiresAt.toISOString()}\n\nThis request does not initiate a blockchain transaction.` : "";
  if (!record || record.address !== address || record.consumedAt || record.expiresAt < new Date() || body.message !== expectedMessage) {
    return NextResponse.json({ error: "This sign-in request is invalid or expired." }, { status: 401 });
  }
  const valid = await verifyMessage({ address: parsed.data.address as `0x${string}`, message: body.message, signature: parsed.data.signature as `0x${string}` });
  if (!valid) return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });
  const consumed = await prisma.authNonce.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return NextResponse.json({ error: "This sign-in request was already used." }, { status: 409 });
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id, address, expiresAt } });
  const response = NextResponse.json({ address, expiresAt });
  response.cookies.set("pp_session", signSession(id), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
  return response;
}
