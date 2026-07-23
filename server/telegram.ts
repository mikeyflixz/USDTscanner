// server/api/telegram.ts
import { defineEventHandler } from 'h3';
import { TG_BOT_TOKEN, TG_CHAT_ID } from '../../src/config';

export default defineEventHandler(async (event) => {
  const { message } = await readBody(event);

  try {
    await $fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: TG_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Telegram error:', error);
    return { success: false, error: error.message };
  }
});