import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, parseEther, stringToHex, zeroHash } from "viem";

describe("ProofPassRescue", async () => {
  const { viem, networkHelpers } = await network.getOrCreate();
  const [admin, canteen, volunteer, ngo, sponsor, outsider] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  let rescue: Awaited<ReturnType<typeof viem.deployContract>>;
  const id = keccak256(stringToHex("PP-TEST-001"));
  const amount = parseEther("0.1");

  async function grantRoles() {
    const canteenRole = await rescue.read.CANTEEN_ROLE() as `0x${string}`;
    const ngoRole = await rescue.read.NGO_ROLE() as `0x${string}`;
    await rescue.write.grantRole([canteenRole, canteen.account.address]);
    await rescue.write.grantRole([ngoRole, ngo.account.address]);
  }

  async function create(deliveryId = id, pickupOffset = 3600n) {
    const block = await publicClient.getBlock();
    return rescue.write.createDelivery([{
      id: deliveryId,
      volunteer: volunteer.account.address,
      receiver: ngo.account.address,
      declaredQuantity: 100n,
      pickupDeadline: block.timestamp + pickupOffset,
      deliveryDeadline: block.timestamp + pickupOffset + 3600n,
      reimbursement: amount,
      publicDescriptionHash: zeroHash,
    }], { account: canteen.account });
  }

  async function fundAndPickup(deliveryId = id) {
    await rescue.write.fund([deliveryId], { account: sponsor.account, value: amount });
    await rescue.write.confirmPickup([deliveryId], { account: volunteer.account });
  }

  beforeEach(async () => {
    rescue = await viem.deployContract("ProofPassRescue", [admin.account.address]);
    await grantRoles();
  });

  it("runs the successful escrow, settlement, and withdrawal path", async () => {
    await create();
    await fundAndPickup();
    await rescue.write.confirmReceipt([id, 100n, zeroHash], { account: ngo.account });
    await rescue.write.settle([id], { account: outsider.account });
    await assert.rejects(rescue.write.settle([id], { account: outsider.account }));
    const delivery = await rescue.read.getDelivery([id]) as { status: number };
    assert.equal(delivery.status, 5); // SETTLED
    assert.equal(await rescue.read.withdrawable([volunteer.account.address]), amount);
    await rescue.write.withdraw({ account: volunteer.account });
    assert.equal(await rescue.read.withdrawable([volunteer.account.address]), 0n);
    const liabilities = await rescue.read.liabilities() as readonly bigint[];
    assert.deepEqual(liabilities, [0n, 0n, 0n]);
  });

  it("opens a dispute for a quantity mismatch and rejects repeat settlement", async () => {
    await create();
    await fundAndPickup();
    await rescue.write.confirmReceipt([id, 80n, keccak256(stringToHex("20 damaged"))], { account: ngo.account });
    const disputed = await rescue.read.getDelivery([id]) as { status: number };
    assert.equal(disputed.status, 6); // DISPUTED
    await assert.rejects(rescue.write.settle([id], { account: outsider.account }));
    await rescue.write.resolve([id, parseEther("0.08")], { account: admin.account });
    await assert.rejects(rescue.write.resolve([id, amount], { account: admin.account }));
    assert.equal(await rescue.read.withdrawable([volunteer.account.address]), parseEther("0.08"));
    assert.equal(await rescue.read.withdrawable([sponsor.account.address]), parseEther("0.02"));
  });

  it("rejects unauthorized confirmations and incorrect funding", async () => {
    await create();
    await assert.rejects(rescue.write.fund([id], { account: sponsor.account, value: amount - 1n }));
    await rescue.write.fund([id], { account: sponsor.account, value: amount });
    await assert.rejects(rescue.write.confirmPickup([id], { account: outsider.account }));
  });

  it("refunds an uncollected delivery after the pickup deadline", async () => {
    await create(id, 60n);
    await rescue.write.fund([id], { account: sponsor.account, value: amount });
    await assert.rejects(rescue.write.refundUncollected([id], { account: sponsor.account }));
    await networkHelpers.time.increase(61);
    await rescue.write.refundUncollected([id], { account: sponsor.account });
    assert.equal(await rescue.read.withdrawable([sponsor.account.address]), amount);
  });

  it("rejects duplicate ids and distinct-party violations", async () => {
    await create();
    await assert.rejects(create());
    const block = await publicClient.getBlock();
    await assert.rejects(rescue.write.createDelivery([{
      id: keccak256(stringToHex("bad")), volunteer: canteen.account.address, receiver: ngo.account.address,
      declaredQuantity: 1n, pickupDeadline: block.timestamp + 10n, deliveryDeadline: block.timestamp + 20n,
      reimbursement: 1n, publicDescriptionHash: zeroHash,
    }], { account: canteen.account }));
  });

  it("uses the permissionless proportional fallback after dispute timeout", async () => {
    await create(); await fundAndPickup();
    await rescue.write.confirmReceipt([id, 80n, keccak256(stringToHex("short"))], { account: ngo.account });
    await networkHelpers.time.increase(14 * 24 * 60 * 60 + 1);
    await rescue.write.resolveTimedOutDispute([id], { account: outsider.account });
    assert.equal(await rescue.read.withdrawable([volunteer.account.address]), parseEther("0.08"));
  });

  it("keeps balances intact when a recipient attempts withdrawal reentrancy", async () => {
    const attacker = await viem.deployContract("ReentrantVolunteer", [rescue.address]);
    const attackId = keccak256(stringToHex("PP-ATTACK")); const block = await publicClient.getBlock();
    await rescue.write.createDelivery([{ id: attackId, volunteer: attacker.address, receiver: ngo.account.address, declaredQuantity: 1n, pickupDeadline: block.timestamp + 3600n, deliveryDeadline: block.timestamp + 7200n, reimbursement: amount, publicDescriptionHash: zeroHash }], { account: canteen.account });
    await rescue.write.fund([attackId], { account: sponsor.account, value: amount });
    await attacker.write.pickup([attackId], { account: outsider.account });
    await rescue.write.confirmReceipt([attackId, 1n, zeroHash], { account: ngo.account });
    await rescue.write.settle([attackId], { account: outsider.account });
    await assert.rejects(attacker.write.withdraw({ account: outsider.account }));
    assert.equal(await rescue.read.withdrawable([attacker.address]), amount);
  });
});
