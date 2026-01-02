export async function sendTelegramMessage(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
        console.warn("Telegram credentials not found. Skipping notification.")
        return
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            console.error("Failed to send Telegram message:", await res.text())
        }
    } catch (error) {
        console.error("Error sending Telegram message:", error)
    }
}
