import { TG_BOT_TOKEN, TG_CHAT_ID } from "../config";

const API = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;

export async function notify(message: string) {
  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.warn("Telegram notification failed:", e);
  }
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}