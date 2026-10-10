import { notFound } from "next/navigation";
import { createPublicClient,formatEther,http,keccak256,parseEther,stringToHex,zeroAddress } from "viem";
import { DemoBanner } from "@/components/demo-banner";
import { ProofDisclaimer } from "@/components/disclaimer";
import { PageHead } from "@/components/page-head";
import { QrCard } from "@/components/qr-card";
import { ReceiptForm } from "@/components/receipt-form";
import { TransactionButton } from "@/components/transaction-button";
import { contractAddress,monadTestnet,proofPassAbi,statusLabels } from "@/lib/chain";
import { demoBatches,shorten } from "@/lib/demo";

export const dynamic="force-dynamic";

export default async function BatchDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const demo=demoBatches.find((item)=>item.id===id);
  if(demo)return <DemoBatch id={id} batch={demo}/>;
  if(!contractAddress)notFound();
  const bytesId=keccak256(stringToHex(id));
  const client=createPublicClient({chain:monadTestnet,transport:http(monadTestnet.rpcUrls.default.http[0],{timeout:8_000})});
  let batch;
  try{batch=await client.readContract({address:contractAddress,abi:proofPassAbi,functionName:"getDelivery",args:[bytesId]});}catch{notFound();}
  const chainNow=(await client.getBlock()).timestamp;
  const reimbursement=formatEther(batch.reimbursement);
  const sponsor=batch.sponsor===zeroAddress?"Not funded":batch.sponsor;
  const status=statusLabels[batch.status];
  const pickupExpired=chainNow>batch.pickupDeadline;
  const withdrawalAccount=status==="SETTLED"?batch.volunteer:status==="REFUNDED"?batch.sponsor:undefined;
  const availableWithdrawal=withdrawalAccount?await client.readContract({address:contractAddress,abi:proofPassAbi,functionName:"withdrawable",args:[withdrawalAccount]}):0n;
  return <main className="page container"><PageHead eyebrow="Live Monad delivery" title={id}><p>Live record read directly from the ProofPass Rescue contract.</p></PageHead><section className="grid">
    <article className="card span-8"><h2 className="display">Terms & status</h2><dl className="detail-list">
      <Row k="Status" v={<span className={`status ${status==="DISPUTED"?"status-disputed":""}`}>{status}</span>}/><Row k="Declared quantity" v={`${batch.declaredQuantity} portions`}/><Row k="Received quantity" v={batch.receivedQuantity===0n?"Not yet confirmed":`${batch.receivedQuantity} portions`}/><Row k="Canteen" v={batch.canteen}/><Row k="Volunteer" v={batch.volunteer}/><Row k="Receiving NGO" v={batch.receiver}/><Row k="Sponsor" v={sponsor}/><Row k="Reimbursement" v={`${reimbursement} MON`}/><Row k="Pickup deadline" v={formatUnix(batch.pickupDeadline)}/><Row k="Delivery deadline" v={formatUnix(batch.deliveryDeadline)}/>
    </dl><LiveActions status={status} pickupExpired={pickupExpired} bytesId={bytesId} reimbursement={batch.reimbursement} declared={Number(batch.declaredQuantity)} canteen={batch.canteen} volunteer={batch.volunteer} receiver={batch.receiver} sponsor={batch.sponsor} availableWithdrawal={availableWithdrawal}/></article>
    <aside className="card span-4"><h2 className="display">Public QR</h2><QrCard id={id}/></aside>
    <article className="card span-12"><h2 className="display">Confirmation history</h2><div className="timeline"><Timeline name="Canteen created terms" actor={batch.canteen} time={batch.createdAt}/>{batch.fundedAt>0n&&<Timeline name={`Sponsor escrowed ${reimbursement} MON`} actor={batch.sponsor} time={batch.fundedAt}/>} {batch.pickedUpAt>0n&&<Timeline name="Volunteer confirmed pickup" actor={batch.volunteer} time={batch.pickedUpAt}/>} {batch.receivedAt>0n&&<Timeline name={`NGO confirmed ${batch.receivedQuantity} portions received`} actor={batch.receiver} time={batch.receivedAt}/>}</div></article>
  </section><div style={{marginTop:28}}><ProofDisclaimer/></div></main>;
}

function DemoBatch({id,batch}:{id:string;batch:(typeof demoBatches)[number]}){const bytesId=keccak256(stringToHex(batch.id));return <main className="page container"><PageHead eyebrow="Delivery record" title={batch.id}><p>{batch.description}</p></PageHead><DemoBanner/><section className="grid"><article className="card span-8"><h2 className="display">Terms & status</h2><dl className="detail-list"><Row k="Status" v={<span className={`status ${batch.status==="DISPUTED"?"status-disputed":""}`}>{batch.status}</span>}/><Row k="Declared quantity" v={`${batch.quantity} portions`}/><Row k="Received quantity" v={batch.received===undefined?"Not yet confirmed":`${batch.received} portions`}/><Row k="Canteen" v={`${shorten(batch.canteen)} · ${batch.canteen}`}/><Row k="Volunteer" v={batch.volunteer}/><Row k="Receiving NGO" v={batch.receiver}/><Row k="Reimbursement" v={`${batch.reimbursement} MON`}/></dl><div className="actions"><TransactionButton label="Fund exact amount" functionName="fund" args={[bytesId]} value={parseEther(batch.reimbursement)}/><TransactionButton label="Confirm pickup" functionName="confirmPickup" args={[bytesId]}/><TransactionButton label="Settle" functionName="settle" args={[bytesId]}/><TransactionButton label="Withdraw my balance" functionName="withdraw"/></div><ReceiptForm id={bytesId} declared={batch.quantity}/></article><aside className="card span-4"><h2 className="display">Public QR</h2><QrCard id={id}/></aside></section><div style={{marginTop:28}}><ProofDisclaimer/></div></main>}
function LiveActions({status,pickupExpired,bytesId,reimbursement,declared,canteen,volunteer,receiver,sponsor,availableWithdrawal}:{status:string;pickupExpired:boolean;bytesId:`0x${string}`;reimbursement:bigint;declared:number;canteen:`0x${string}`;volunteer:`0x${string}`;receiver:`0x${string}`;sponsor:`0x${string}`;availableWithdrawal:bigint}){
  if(status==="CREATED"&&pickupExpired)return <div style={{marginTop:24}}><p className="error">This batch expired before funding and can no longer be picked up. Cancel it, then create a new batch with future deadlines.</p><TransactionButton label="Cancel expired batch" functionName="cancelUnfunded" args={[bytesId]} requiredAccount={canteen} requiredLabel="Canteen"/></div>;
  if(status==="CREATED")return <div className="actions"><TransactionButton label="Fund exact amount" functionName="fund" args={[bytesId]} value={reimbursement}/></div>;
  if(status==="FUNDED"&&pickupExpired)return <div style={{marginTop:24}}><p className="error">The funded pickup deadline expired. The sponsor must refund the escrow, then withdraw it.</p><TransactionButton label="Refund uncollected batch" functionName="refundUncollected" args={[bytesId]} requiredAccount={sponsor} requiredLabel="Sponsor"/></div>;
  if(status==="FUNDED")return <div className="actions"><TransactionButton label="Confirm pickup" functionName="confirmPickup" args={[bytesId]} requiredAccount={volunteer} requiredLabel="Volunteer"/></div>;
  if(status==="PICKED UP")return <ReceiptForm id={bytesId} declared={declared} requiredAccount={receiver}/>;
  if(status==="RECEIVED")return <div className="actions"><TransactionButton label="Settle reimbursement" functionName="settle" args={[bytesId]}/></div>;
  if(status==="SETTLED")return availableWithdrawal>0n?<div className="actions"><TransactionButton label="Withdraw volunteer reimbursement" functionName="withdraw" requiredAccount={volunteer} requiredLabel="Volunteer"/></div>:<p className="success" style={{marginTop:24}}>Volunteer reimbursement has already been withdrawn.</p>;
  if(status==="REFUNDED")return availableWithdrawal>0n?<div className="actions"><TransactionButton label="Withdraw sponsor refund" functionName="withdraw" requiredAccount={sponsor} requiredLabel="Sponsor"/></div>:<p className="success" style={{marginTop:24}}>Sponsor refund has already been withdrawn.</p>;
  if(status==="DISPUTED")return <p className="error" style={{marginTop:24}}>This delivery is disputed and must be resolved by a resolver.</p>;
  return <p className="muted" style={{marginTop:24}}>No further action is available for this batch.</p>;
}
function Row({k,v}:{k:string;v:React.ReactNode}){return <div className="detail-row"><dt>{k}</dt><dd>{v}</dd></div>}
function Timeline({name,actor,time}:{name:string;actor:string;time:bigint}){return <div className="timeline-item"><strong>{name}</strong><p className="mono">{shorten(actor)} · {actor}</p><p className="muted">{formatUnix(time)}</p></div>}
function formatUnix(value:bigint){return new Date(Number(value)*1000).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}
