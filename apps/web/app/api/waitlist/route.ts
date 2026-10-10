import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "@/lib/security";
import { waitlistSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const parsed = waitlistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ipHash = hash(`${ip}:${process.env.SESSION_SECRET || "local"}`);
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const attempts = await prisma.rateLimitEvent.count({ where: { key: `waitlist:${ipHash}`, createdAt: { gte: since } } });
  if (attempts >= 5) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  await prisma.rateLimitEvent.create({ data: { key: `waitlist:${ipHash}` } });
  try {
    await prisma.waitlistEntry.create({ data: { email: parsed.data.email.toLowerCase(), ipHash } });
    return NextResponse.json({ message: "You’re on the pilot list." }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ message: "This email is already on the pilot list." });
    }
    throw error;
  }
}
