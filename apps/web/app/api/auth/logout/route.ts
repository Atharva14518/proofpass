import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/security";
export async function POST() {
  const jar = await cookies();
  const value = jar.get("pp_session")?.value;
  const id = value && verifySessionToken(value);
  if (id) await prisma.session.delete({ where: { id } }).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("pp_session", "", { expires: new Date(0), path: "/" });
  return response;
}
