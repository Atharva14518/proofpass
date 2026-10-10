import { keccak256, parseEther, stringToHex } from "viem";
import type { z } from "zod";
import type { batchSchema } from "./validation";

export function toDeliveryInput(value: z.infer<typeof batchSchema>) {
  return {
    id: keccak256(stringToHex(value.id)), volunteer: value.volunteer as `0x${string}`, receiver: value.receiver as `0x${string}`,
    declaredQuantity: BigInt(value.quantity), pickupDeadline: BigInt(Math.floor(value.pickupDeadline.getTime() / 1000)),
    deliveryDeadline: BigInt(Math.floor(value.deliveryDeadline.getTime() / 1000)), reimbursement: parseEther(value.reimbursement),
    publicDescriptionHash: keccak256(stringToHex(value.description)),
  };
}
