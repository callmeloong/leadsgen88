import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function POST(request: Request) {
    try {
        const update = await request.json()

        // Log update for debugging
        console.log('Telegram Update:', JSON.stringify(update, null, 2))

        // Check if message exists and has text
        if (!update.message || !update.message.text) {
            return NextResponse.json({ ok: true })
        }

        const text = update.message.text.trim()
        const chatId = update.message.chat.id

        // Handle Commands
        if (text === '/rank' || text === '/bxh' || text === '/top' || text.startsWith('/rank') || text.startsWith('/bxh')) {
            await handleLeaderboardCommand(chatId)
        } else if (text === '/matches' || text === '/lich' || text === '/schedule') {
            await handleScheduleCommand(chatId)
        } else if (text === '/ping') {
            await sendMessage(chatId, "Pong! 🏓 Hệ thống vẫn đang chạy ngon lành cành đào.")
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Telegram Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// Helper to handle schedule command
async function handleScheduleCommand(chatId: number) {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    const { data: challenges, error } = await supabase
        .from('Challenge')
        .select(`
            *,
            challenger:challengerId(name),
            opponent:opponentId(name)
        `)
        .eq('status', 'ACCEPTED')
        .gt('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(10)

    if (error) {
        console.error("Error fetching schedule:", error)
        await sendMessage(chatId, "❌ Lỗi khi lấy lịch thi đấu.")
        return
    }

    if (!challenges || challenges.length === 0) {
        await sendMessage(chatId, "📅 Hiện chưa có kèo đấu nào được lên lịch sắp tới.")
        return
    }

    let message = "📅 **LỊCH THI ĐẤU SẮP TỚI** 📅\n\n"

    challenges.forEach((c) => {
        const date = new Date(c.scheduled_time)
        const timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

        message += `⏰ **${timeStr}**\n`
        message += `⚔️ **${c.challenger.name}** vs **${c.opponent.name}**\n`
        if (c.message) message += `💬 "${c.message}"\n`
        message += `-------------------\n`
    })

    message += "\n👉 [Vào app để xem chi tiết](https://leadsgen88.longth.dev)"

    await sendMessage(chatId, message)
}

// Helper to fetch data and send message
async function handleLeaderboardCommand(chatId: number) {
    const supabase = createAdminClient()

    // Fetch Top 10
    const { data: players, error } = await supabase
        .from('Player')
        .select('*')
        .order('elo', { ascending: false })
        .limit(10)

    if (error || !players || players.length === 0) {
        await sendMessage(chatId, "❌ Hiện chưa có dữ liệu bảng xếp hạng.")
        return
    }

    let message = "🏆 **BẢNG XẾP HẠNG TOP 10** 🏆\n\n"

    players.forEach((p, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
        message += `${medal} **${p.name}**\n`
        message += `   ⚜️ ELO: ${p.elo} | ⚔️ W/L: ${p.wins}/${p.losses}\n\n`
    })

    message += "👉 Xem chi tiết tại: [PoolRank App](https://leadsgen88.longth.dev)"

    await sendMessage(chatId, message)
}

// Helper to send message via Telegram API
async function sendMessage(chatId: number | string, text: string) {
    if (!TELEGRAM_TOKEN) {
        console.error("Missing TELEGRAM_BOT_TOKEN")
        return
    }

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        })
    } catch (e) {
        console.error("Failed to send Telegram message", e)
    }
}
