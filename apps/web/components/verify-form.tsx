"use client";
import { FormEvent,useRef,useState } from "react";
import { useRouter } from "next/navigation";
type DetectorResult={rawValue:string};
type DetectorConstructor=new (options:{formats:string[]})=>{detect(source:ImageBitmap):Promise<DetectorResult[]>};
export function VerifyForm(){
  const [error,setError]=useState(""); const file=useRef<HTMLInputElement>(null); const router=useRouter();
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const id=String(new FormData(event.currentTarget).get("id")||"").trim();if(!id){setError("Enter a batch ID or bytes32 identifier.");return;}router.push(`/verify/${encodeURIComponent(id)}`);}
  async function scan(image?:File){if(!image)return;setError("");try{const Detector=(window as unknown as {BarcodeDetector?:DetectorConstructor}).BarcodeDetector;if(!Detector)throw new Error("QR scanning is not supported by this browser. Paste the batch ID instead.");const bitmap=await createImageBitmap(image);const codes=await new Detector({formats:["qr_code"]}).detect(bitmap);if(!codes[0])throw new Error("No QR code was found in that image.");const url=new URL(codes[0].rawValue);if(!url.pathname.includes("/verify/"))throw new Error("This is not a ProofPass verification QR.");router.push(url.pathname);}catch(cause){setError(cause instanceof Error?cause.message:"Unable to scan QR.");}}
  return <><form onSubmit={submit} className="form-grid"><div className="field wide"><label htmlFor="verify-id">Batch ID or bytes32 identifier</label><input id="verify-id" name="id" placeholder="PP-2026-001 or 0x…"/></div><div className="actions wide"><button className="button button-primary">Verify record</button><button className="button" type="button" onClick={()=>file.current?.click()}>Scan QR image</button><input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(event)=>scan(event.target.files?.[0])}/></div></form>{error&&<p className="error" role="alert">{error}</p>}</>;
}
