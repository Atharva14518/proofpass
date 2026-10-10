import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    profiles: {
      default: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 500 } } },
      production: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 1000 }, viaIR: true } }
    }
  },
  networks: {
    monadTestnet: {
      type: "http",
      chainType: "generic",
      chainId: 10143,
      url: configVariable("MONAD_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")]
    }
  }
});
