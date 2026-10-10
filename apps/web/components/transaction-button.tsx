"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection,useWaitForTransactionReceipt,useWriteContract } from "wagmi";
import { contractAddress,explorerTx,monadTestnet,proofPassAbi } from "@/lib/chain";

type Supported="fund"|"confirmPickup"|"confirmReceipt"|"settle"|"cancelUnfunded"|"refundUncollected"|"resolve"|"withdraw";
export function TransactionButton({label,functionName,args=[],value,requiredAccount,requiredLabel="authorized"}:{label:string;functionName:Supported;args?:readonly unknown[];value?:bigint;requiredAccount?:`0x${string}`;requiredLabel?:string}){
  const router=useRouter(); const connection=useConnection(); const chainId=connection.chainId; const account=connection.address;
  const [localError,setLocalError]=useState(""); const write=useWriteContract();
  const receipt=useWaitForTransactionReceipt({hash:write.data,chainId:monadTestnet.id});
  useEffect(()=>{if(receipt.isSuccess)router.refresh();},[receipt.isSuccess,router]);
  const wrongAccount=Boolean(requiredAccount&&account?.toLowerCase()!==requiredAccount.toLowerCase());
  async function act(){setLocalError("");if(!contractAddress){setLocalError("Contract address is not configured.");return;}if(!account){setLocalError("Connect the wallet that is authorized for this action.");return;}if(requiredAccount&&account.toLowerCase()!==requiredAccount.toLowerCase()){setLocalError(`Switch MetaMask to the assigned ${requiredLabel} wallet: ${requiredAccount}`);return;}if(chainId!==monadTestnet.id){setLocalError("Switch to Monad Testnet before submitting.");return;}try{await write.writeContractAsync({address:contractAddress,abi:proofPassAbi,functionName,args,value,account,chainId:monadTestnet.id} as never);}catch(e){setLocalError(e instanceof Error&&/rejected|denied/i.test(e.message)?"The wallet request was rejected.":e instanceof Error?e.message:"Transaction failed.");}}
  const text=write.isPending?"Confirm in wallet…":receipt.isLoading?"Pending confirmation…":label;
  return <div>{wrongAccount&&<p className="error" role="alert">Switch MetaMask to the assigned {requiredLabel} wallet: <span className="mono">{requiredAccount}</span></p>}<button className="button button-primary" disabled={wrongAccount||write.isPending||receipt.isLoading} onClick={act}>{text}</button>{write.data&&<p className="tx-state" role="status">{receipt.isSuccess?"Confirmed on Monad Testnet.":receipt.isError?"Transaction failed on-chain.":"Transaction submitted."} <a href={explorerTx(write.data)} target="_blank" rel="noreferrer">View transaction</a></p>}{(localError||write.error)&&<p className="error" role="alert">{localError||write.error?.message}</p>}</div>;
}
