import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = { title: "ProofPass Rescue", description: "Confirmed food-rescue handoffs and accountable transport funding on Monad Testnet." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="preconnect" href="https://api.fontshare.com"/><link href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@700&f[]=general-sans@300,400,500,600,700&display=swap" rel="stylesheet"/></head><body><Providers><SiteNav />{children}</Providers></body></html>;
}
