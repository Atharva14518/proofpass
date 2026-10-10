import { isAddress } from "viem";
import { z } from "zod";

const address = z.string().refine(isAddress, "Enter a valid EVM address");
export const waitlistSchema = z.object({ email: z.email().max(254) });
export const nonceSchema = z.object({ address });
export const verifyAuthSchema = z.object({ address, nonce: z.string().min(20).max(200), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });
export const batchSchema = z.object({
  id: z.string().min(3).max(64).regex(/^[A-Za-z0-9_-]+$/),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  volunteer: address,
  receiver: address,
  pickupDeadline: z.coerce.date(),
  deliveryDeadline: z.coerce.date(),
  reimbursement: z.string().regex(/^\d+(\.\d{1,18})?$/, "Enter an amount in MON"),
  description: z.string().min(3).max(300),
  pickupInstructions: z.string().min(3).max(1000),
}).refine((v) => v.deliveryDeadline > v.pickupDeadline, { message: "Delivery deadline must follow pickup", path: ["deliveryDeadline"] });

export const csvRowSchema = z.object({
  id: z.string().min(3).max(64).regex(/^[A-Za-z0-9_-]+$/),
  quantity: z.coerce.number().int().positive(), volunteer: address, receiver: address,
  pickupDeadline: z.string().datetime(), deliveryDeadline: z.string().datetime(),
  reimbursement: z.string().regex(/^\d+(\.\d{1,18})?$/), description: z.string().min(3).max(300),
}).refine((v) => new Date(v.deliveryDeadline) > new Date(v.pickupDeadline), { message: "Delivery deadline must follow pickup" });
