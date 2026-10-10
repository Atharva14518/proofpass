import Link from "next/link";
import { WalletControl } from "./wallet-control";
export function SiteNav() {
  return <nav className="site-nav" aria-label="Primary"><Link href="/" className="label">PP—PROTOCOL 01</Link><span className="nav-rule" aria-hidden="true"/><div className="nav-right"><span className="label network-label">Monad Testnet</span><WalletControl /></div></nav>;
}
