import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProofPassRescueModule", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const proofPassRescue = m.contract("ProofPassRescue", [admin]);
  return { proofPassRescue };
});
