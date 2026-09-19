// API Route ฝั่ง server สำหรับส่งข้อความแจ้งเตือนเข้า Telegram
// เก็บ token ไว้ฝั่ง server เท่านั้น ป้องกันไม่ให้หลุดไปที่ browser

export async function POST(request) {
  try {
    const { text } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return Response.json(
        { ok: false, error: 'Telegram config ไม่ครบใน environment variables' },
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
          text,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await telegramRes.json();

    if (!telegramRes.ok) {
      return Response.json({ ok: false, error: data }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
