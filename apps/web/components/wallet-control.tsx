"use client";
import { useState } from "react";
import { formatEther } from "viem";
import { useBalance,useConnect,useConnection,useDisconnect,useSignMessage,useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/chain";
import { shorten } from "@/lib/demo";

export function WalletControl(){
  const [open,setOpen]=useState(false); const [message,setMessage]=useState("");
  const connection=useConnection(); const chainId=connection.chainId;
  const {connectors,connectAsync,error:connectError,isPending}=useConnect();
  const {disconnect}=useDisconnect(); const {switchChain,isPending:switching}=useSwitchChain(); const {signMessageAsync}=useSignMessage();
  const balance=useBalance({address:connection.address,chainId:monadTestnet.id});

  async function connectMetaMask(){
    setMessage(""); setOpen(true);
    if(typeof window!=="undefined"&&!(window as typeof window&{ethereum?:unknown}).ethereum){setMessage("MetaMask was not detected. Install or enable the MetaMask browser extension, then reload this page.");return;}
    const connector=connectors[0]; if(!connector){setMessage("MetaMask is still initializing. Reload the page and try again.");return;}
    try{await connectAsync({connector});setOpen(false);}catch(error){setMessage(error instanceof Error&&/rejected|denied/i.test(error.message)?"The MetaMask connection request was rejected.":error instanceof Error?error.message:"MetaMask could not connect.");}
  }
  async function signIn(){if(!connection.address)return;setMessage("Preparing signature request…");try{const nonceResponse=await fetch("/api/auth/nonce",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({address:connection.address})});const data=await nonceResponse.json();if(!nonceResponse.ok)throw new Error(data.error);setMessage("Confirm the sign-in message in MetaMask…");const signature=await signMessageAsync({message:data.message});const verify=await fetch("/api/auth/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({address:connection.address,nonce:data.nonce,message:data.message,signature})});const result=await verify.json();if(!verify.ok)throw new Error(result.error);setMessage("Signed in securely.");}catch(error){setMessage(error instanceof Error?error.message:"Signature rejected.");}}

  if(!connection.isConnected)return <><button className="button button-primary button-small" onClick={connectMetaMask} aria-expanded={open} disabled={isPending}>{isPending?"Connecting…":"Connect wallet"}</button>{open&&<div className="wallet-panel"><p className="label">MetaMask connection</p>{message&&<p className="error" role="alert">{message}</p>}{connectError&&!message&&<p className="error">{connectError.message}</p>}<button className="button" style={{width:"100%"}} onClick={connectMetaMask} disabled={isPending}>Try again</button><p className="muted" style={{fontSize:13}}>ProofPass never asks for your private key.</p></div>}</>;
  return <><button className="button button-small" onClick={()=>setOpen(!open)} aria-expanded={open}>{shorten(connection.address!)}</button>{open&&<div className="wallet-panel"><p className="label">Connected wallet</p><p className="mono">{connection.address}</p><p>{balance.data?`${Number(formatEther(balance.data.value)).toFixed(4)} MON`:"Loading balance…"}</p>{chainId!==monadTestnet.id&&<><p className="error">Wrong network. Switch to Monad Testnet.</p><button className="button button-primary" disabled={switching} onClick={()=>switchChain({chainId:monadTestnet.id})}>{switching?"Requesting…":"Switch network"}</button></>}<div className="actions"><button className="button" onClick={signIn}>Sign in</button><button className="button" onClick={()=>{disconnect();setOpen(false)}}>Disconnect</button></div>{message&&<p className="tx-state" role="status">{message}</p>}</div>}</>;
}
