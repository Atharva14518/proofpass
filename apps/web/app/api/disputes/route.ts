import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/security";
import { z } from "zod";
const schema = z.object({ deliveryId: z.string().regex(/^0x[0-9a-fA-F]{64}$/), reason: z.string().min(3).max(1000) });
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid dispute note." }, { status: 400 });
    const note = await prisma.disputeNote.create({ data: { ...parsed.data, author: session.address } });
    return NextResponse.json({ id: note.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    throw error;
  }
}
