export type DemoBatch = {
  id: string; hash: `0x${string}`; status: string; quantity: number; received?: number; reimbursement: string;
  canteen: `0x${string}`; volunteer: `0x${string}`; receiver: `0x${string}`; sponsor?: `0x${string}`;
  pickup: string; delivery: string; description: string;
};
const addresses = {
  canteen: "0x1000000000000000000000000000000000000001" as const,
  volunteer: "0x2000000000000000000000000000000000000002" as const,
  receiver: "0x3000000000000000000000000000000000000003" as const,
  sponsor: "0x4000000000000000000000000000000000000004" as const,
};
export const demoBatches: DemoBatch[] = [
  { id:"PP-DEMO-001",hash:"0xec1b7f3a60485f3f0cd8c9296801d2f36078c220cf12fd7fc1fbc8f70244bdb7",status:"SETTLED",quantity:120,received:120,reimbursement:"0.18",...addresses,pickup:"2026-10-08T12:00:00Z",delivery:"2026-10-08T13:10:00Z",description:"Prepared lunch portions from the staff canteen." },
  { id:"PP-DEMO-002",hash:"0x3d6c196bd629de0bbb90c9f68b1b66f885d2670adc22630398f91bea83ad6f0b",status:"DISPUTED",quantity:100,received:80,reimbursement:"0.12",...addresses,pickup:"2026-10-09T10:00:00Z",delivery:"2026-10-09T11:30:00Z",description:"Sealed vegetarian meal trays." },
  { id:"PP-DEMO-003",hash:"0x6d5cac8de8384021637e58d3117208569c32ca1a96fb80304c276438a378193f",status:"AWAITING RECEIPT",quantity:64,reimbursement:"0.08",...addresses,pickup:"2026-10-10T09:20:00Z",delivery:"",description:"Bakery surplus packed for same-day collection." },
];
export const shorten = (value: string, size = 6) => `${value.slice(0, size + 2)}…${value.slice(-4)}`;
