import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "MonadVision", url: "https://testnet.monadvision.com" } },
  testnet: true,
});

export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
export const explorerTx = (hash: string) => `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddress = (address: string) => `${monadTestnet.blockExplorers.default.url}/address/${address}`;

export const proofPassAbi = [
  { type:"error", name:"AccessControlUnauthorizedAccount", inputs:[{name:"account",type:"address"},{name:"neededRole",type:"bytes32"}] },
  { type:"error", name:"ZeroAddress", inputs:[] },
  { type:"error", name:"InvalidTerms", inputs:[] },
  { type:"error", name:"DuplicateDelivery", inputs:[{name:"id",type:"bytes32"}] },
  { type:"error", name:"UnknownDelivery", inputs:[{name:"id",type:"bytes32"}] },
  { type:"error", name:"InvalidState", inputs:[{name:"expected",type:"uint8"},{name:"actual",type:"uint8"}] },
  { type:"error", name:"Unauthorized", inputs:[] },
  { type:"error", name:"IncorrectFunding", inputs:[{name:"expected",type:"uint256"},{name:"received",type:"uint256"}] },
  { type:"error", name:"DeadlineNotReached", inputs:[] },
  { type:"error", name:"DeadlinePassed", inputs:[] },
  { type:"error", name:"BatchTooLarge", inputs:[] },
  { type:"error", name:"TransferFailed", inputs:[] },
  { type:"error", name:"LiabilityInvariant", inputs:[] },
  { type: "function", name: "getDelivery", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }], outputs: [{ name: "", type: "tuple", components: [
    {name:"id",type:"bytes32"},{name:"canteen",type:"address"},{name:"volunteer",type:"address"},{name:"receiver",type:"address"},{name:"sponsor",type:"address"},
    {name:"declaredQuantity",type:"uint64"},{name:"receivedQuantity",type:"uint64"},{name:"createdAt",type:"uint64"},{name:"fundedAt",type:"uint64"},{name:"pickedUpAt",type:"uint64"},{name:"receivedAt",type:"uint64"},{name:"resolvedAt",type:"uint64"},{name:"pickupDeadline",type:"uint64"},{name:"deliveryDeadline",type:"uint64"},{name:"reimbursement",type:"uint128"},{name:"escrow",type:"uint128"},{name:"status",type:"uint8"},{name:"publicDescriptionHash",type:"bytes32"},{name:"discrepancyHash",type:"bytes32"}
  ]}]},
  { type:"function", name:"createDelivery", stateMutability:"nonpayable", inputs:[{name:"input",type:"tuple",components:[{name:"id",type:"bytes32"},{name:"volunteer",type:"address"},{name:"receiver",type:"address"},{name:"declaredQuantity",type:"uint64"},{name:"pickupDeadline",type:"uint64"},{name:"deliveryDeadline",type:"uint64"},{name:"reimbursement",type:"uint128"},{name:"publicDescriptionHash",type:"bytes32"}]}], outputs:[] },
  { type:"function", name:"createDeliveries", stateMutability:"nonpayable", inputs:[{name:"inputs",type:"tuple[]",components:[{name:"id",type:"bytes32"},{name:"volunteer",type:"address"},{name:"receiver",type:"address"},{name:"declaredQuantity",type:"uint64"},{name:"pickupDeadline",type:"uint64"},{name:"deliveryDeadline",type:"uint64"},{name:"reimbursement",type:"uint128"},{name:"publicDescriptionHash",type:"bytes32"}]}], outputs:[] },
  { type:"function", name:"fund", stateMutability:"payable", inputs:[{name:"id",type:"bytes32"}], outputs:[] },
  { type:"function", name:"confirmPickup", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"}], outputs:[] },
  { type:"function", name:"confirmReceipt", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"},{name:"quantity",type:"uint64"},{name:"discrepancyHash",type:"bytes32"}], outputs:[] },
  { type:"function", name:"settle", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"}], outputs:[] },
  { type:"function", name:"cancelUnfunded", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"}], outputs:[] },
  { type:"function", name:"refundUncollected", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"}], outputs:[] },
  { type:"function", name:"resolve", stateMutability:"nonpayable", inputs:[{name:"id",type:"bytes32"},{name:"volunteerCredit",type:"uint128"}], outputs:[] },
  { type:"function", name:"withdraw", stateMutability:"nonpayable", inputs:[], outputs:[] },
  { type:"function", name:"withdrawable", stateMutability:"view", inputs:[{name:"",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { type:"function", name:"grantRole", stateMutability:"nonpayable", inputs:[{name:"role",type:"bytes32"},{name:"account",type:"address"}], outputs:[] },
  { type:"function", name:"revokeRole", stateMutability:"nonpayable", inputs:[{name:"role",type:"bytes32"},{name:"account",type:"address"}], outputs:[] },
  { type:"function", name:"CANTEEN_ROLE", stateMutability:"view", inputs:[], outputs:[{name:"",type:"bytes32"}] },
  { type:"function", name:"NGO_ROLE", stateMutability:"view", inputs:[], outputs:[{name:"",type:"bytes32"}] },
  { type:"function", name:"RESOLVER_ROLE", stateMutability:"view", inputs:[], outputs:[{name:"",type:"bytes32"}] },
  { type:"event", name:"DeliveryCreated", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"canteen",type:"address",indexed:true},{name:"volunteer",type:"address",indexed:true},{name:"receiver",type:"address",indexed:false},{name:"quantity",type:"uint64",indexed:false},{name:"reimbursement",type:"uint128",indexed:false}]},
  { type:"event", name:"DeliveryFunded", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"sponsor",type:"address",indexed:true},{name:"amount",type:"uint256",indexed:false}]},
  { type:"event", name:"PickupConfirmed", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"volunteer",type:"address",indexed:true},{name:"timestamp",type:"uint64",indexed:false}]},
  { type:"event", name:"ReceiptConfirmed", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"receiver",type:"address",indexed:true},{name:"declaredQuantity",type:"uint64",indexed:false},{name:"receivedQuantity",type:"uint64",indexed:false},{name:"discrepancyHash",type:"bytes32",indexed:false}]},
  { type:"event", name:"DeliverySettled", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"volunteer",type:"address",indexed:true},{name:"amount",type:"uint256",indexed:false}]},
  { type:"event", name:"DeliveryDisputed", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"declaredQuantity",type:"uint64",indexed:false},{name:"receivedQuantity",type:"uint64",indexed:false}]},
  { type:"event", name:"DeliveryRefunded", inputs:[{name:"id",type:"bytes32",indexed:true},{name:"sponsor",type:"address",indexed:true},{name:"amount",type:"uint256",indexed:false}]},
] as const;

export const statusLabels = ["UNKNOWN", "CREATED", "FUNDED", "PICKED UP", "RECEIVED", "SETTLED", "DISPUTED", "CANCELLED", "REFUNDED"] as const;
