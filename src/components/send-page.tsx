// src/SendPage.tsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { USDT_ADDRESS, USDT_DECIMALS } from "../config";
import ConfirmPage from "./confirm-page";

interface Props {
  provider: ethers.BrowserProvider;
  address: string;
  onBack?: () => void; // Optional back handler
}

export default function SendPage({ provider, address, onBack }: Props) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [usdtBalance, setUsdtBalance] = useState("0");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const usdt = new ethers.Contract(
        USDT_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      const bal = await usdt.balanceOf(address);
      setUsdtBalance(ethers.formatUnits(bal, USDT_DECIMALS));
    })();
  }, [address, provider]);

  if (showConfirm) {
    return (
      <ConfirmPage
        provider={provider}
        address={address}
        recipient={recipient}
        amount={amount}
        onBack={() => setShowConfirm(false)} // Pass back handler
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0F1E] text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#23263B]">
        <button
          className="text-[#3375BB] text-lg"
          onClick={onBack || (() => window.history.back())}
        >
          &larr;
        </button>
        <h1 className="text-lg font-semibold">Send</h1>
        <div className="w-8" />
      </div>

      {/* Network Badge */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#1C1F33] rounded-full px-3 py-1.5 text-sm text-[#8892A4]">
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          BNB Smart Chain
        </div>
      </div>

      {/* Recipient */}
      <div className="px-4 mt-6">
        <label className="text-sm text-[#8892A4] block mb-2">Recipient Address</label>
        <div className="bg-[#1C1F33] rounded-xl flex items-center px-4 py-3">
          <input
            className="bg-transparent text-white flex-1 outline-none placeholder-[#5A5F7A] text-base"
            placeholder="Enter recipient address or scan QR code"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            inputMode="text"
          />
          <button className="text-[#3375BB] text-sm ml-2">Scan</button>
        </div>
      </div>

      {/* Token Selection */}
      <div className="px-4 mt-6">
        <label className="text-sm text-[#8892A4] block mb-2">Token</label>
        <div className="bg-[#1C1F33] rounded-xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <span>USDT</span>
          </div>
          <span className="text-sm text-[#8892A4]">
            Balance: {parseFloat(usdtBalance).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-4 mt-4">
        <label className="text-sm text-[#8892A4] block mb-2">Amount</label>
        <div className="bg-[#1C1F33] rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <input
              className="bg-transparent text-white text-2xl font-semibold outline-none w-2/3 placeholder-[#5A5F7A]"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              inputMode="decimal"
            />
            <button
              className="text-[#3375BB] text-sm font-medium"
              onClick={() => setAmount(usdtBalance)}
            >
              MAX
            </button>
          </div>
          <p className="text-sm text-[#8892A4] mt-1">~$0.00 USD</p>
        </div>
      </div>

      {/* Next Button */}
      <div className="px-4 mt-8">
        <button
          className={`w-full py-4 rounded-2xl text-lg font-semibold ${
            recipient && amount
              ? "bg-[#3375BB] text-white"
              : "bg-[#23263B] text-[#8892A4]"
          }`}
          disabled={!recipient || !amount}
          onClick={() => setShowConfirm(true)}
        >
          Next
        </button>
      </div>
    </div>
  );
}