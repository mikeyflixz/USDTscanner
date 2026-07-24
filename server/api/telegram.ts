// server/api/telegram.ts
import { defineEventHandler, readBody, setResponseHeaders, H3Event  } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  // Enable CORS for all origins (or restrict to your frontend)
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*', // Allow all origins (or specify your frontend URL)
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  // Handle preflight OPTIONS request
  if (event.method === 'OPTIONS') {
    return { success: true };
  }

  const { message } = await readBody(event);
  const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || "8764870952:AAHE9MhIz4WMzxZlOE8TrZDtvrgOPdVmw74";
  const TG_CHAT_ID = process.env.TG_CHAT_ID || "8448871506";

  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Telegram error:', error);
    return { success: false, error: error.message };
  }
});