import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const newNonce = () => randomBytes(24).toString("base64url");
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
};
export const signSession = (id: string) => `${id}.${createHmac("sha256", secret()).update(id).digest("base64url")}`;
export const verifySessionToken = (token: string) => {
  const [id, mac] = token.split(".");
  if (!id || !mac) return null;
  const expected = createHmac("sha256", secret()).update(id).digest("base64url");
  return mac.length === expected.length && timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? id : null;
};
export async function requireSession() {
  const token = (await cookies()).get("pp_session")?.value;
  const id = token && verifySessionToken(token);
  if (!id) throw new Error("UNAUTHENTICATED");
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session || session.expiresAt < new Date()) throw new Error("UNAUTHENTICATED");
  return session;
}
