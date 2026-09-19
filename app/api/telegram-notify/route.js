// API Route สำหรับส่งข้อความแจ้งเตือนไปยัง Telegram
// รันฝั่ง server เท่านั้น จึงใช้ env var แบบไม่มี NEXT_PUBLIC_ ได้อย่างปลอดภัย
export async function POST(request) {
  try {
    const { message } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return Response.json(
        { ok: false, error: 'ไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID' },
        { status: 500 }
      );
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await telegramRes.json();
    if (!data.ok) {
      return Response.json({ ok: false, error: data.description }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
