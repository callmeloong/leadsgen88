export async function sendTelegramMessage(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    console.log(`[Telegram] Attempting to send message to ${chatId}...`)

    if (!token || !chatId) {
        console.error("[Telegram] CRITICAL: Credentials missing in .env file!")
        console.log("TeleToken:", token ? "OK" : "MISSING")
        console.log("ChatID:", chatId ? "OK" : "MISSING")
        return
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errorText = await res.text()
            console.error(`[Telegram] API Error ${res.status}:`, errorText)
        } else {
            console.log(`[Telegram] Message sent successfully!`)
        }
    } catch (error) {
        console.error("[Telegram] Network Error:", error)
    }
}

export function escapeHtml(unsafe: string | null | undefined): string {
    if (!unsafe) return ""
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
