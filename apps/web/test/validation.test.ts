import { describe,expect,it } from "vitest";
import { batchSchema,csvRowSchema,waitlistSchema } from "@/lib/validation";
import { chunkTransactions,validatedCsvInputs } from "@/lib/csv";

describe("server validation",()=>{
  it("rejects malformed email addresses",()=>expect(waitlistSchema.safeParse({email:"not-an-email"}).success).toBe(false));
  it("rejects a delivery deadline before pickup",()=>expect(batchSchema.safeParse({id:"PP-1",quantity:100,volunteer:"0x1000000000000000000000000000000000000001",receiver:"0x2000000000000000000000000000000000000002",pickupDeadline:"2026-10-11T11:00",deliveryDeadline:"2026-10-11T10:00",reimbursement:"0.1",description:"Food batch",pickupInstructions:"Rear door"}).success).toBe(false));
  it("keeps invalid CSV rows out and splits safe transactions",()=>{const good={id:"PP-100",quantity:"100",volunteer:"0x1000000000000000000000000000000000000001",receiver:"0x2000000000000000000000000000000000000002",pickupDeadline:"2026-10-11T10:00:00.000Z",deliveryDeadline:"2026-10-11T12:00:00.000Z",reimbursement:"0.1",description:"Prepared food"};expect(csvRowSchema.safeParse(good).success).toBe(true);const inputs=validatedCsvInputs([...Array(26).fill(good),{...good,volunteer:"bad"}]);expect(inputs).toHaveLength(26);expect(chunkTransactions(inputs).map(x=>x.length)).toEqual([25,1]);});
});
