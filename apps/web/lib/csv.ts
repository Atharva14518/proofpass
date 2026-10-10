import { csvRowSchema } from "./validation";
import { toDeliveryInput } from "./contract-input";

export function validatedCsvInputs(rows: Record<string, string>[]) {
  return rows.flatMap((row) => {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) return [];
    return [toDeliveryInput({ ...parsed.data, pickupDeadline: new Date(parsed.data.pickupDeadline), deliveryDeadline: new Date(parsed.data.deliveryDeadline), pickupInstructions: "Imported CSV — add private instructions separately." })];
  });
}
export function chunkTransactions<T>(items: T[], size = 25) {
  if (size < 1 || size > 25) throw new Error("Contract batch size must be between 1 and 25");
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}
