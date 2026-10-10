"use client";
import { createConfig, http } from "wagmi";
import { injected } from "@wagmi/connectors/injected";
import { monadTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected({ target: "metaMask" })],
  transports: { [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]) },
  ssr: true,
});
