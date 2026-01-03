import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = createAdminClient()

        // Find challenges scheduled in the next 35 minutes that haven't been notified
        // Logic: scheduled_time > now AND scheduled_time < now + 35 mins AND reminder_sent = false AND status = 'ACCEPTED'

        const now = new Date()
        const future = new Date(now.getTime() + 35 * 60000) // 35 minutes from now

        const { data: upcomingChallenges, error } = await supabase
            .from('Challenge')
            .select(`
                *,
                challenger:challengerId(name, telegram),
                opponent:opponentId(name, telegram)
            `)
            .eq('status', 'ACCEPTED')
            .eq('reminder_sent', false)
            .gt('scheduled_time', now.toISOString())
            .lt('scheduled_time', future.toISOString())

        if (error) {
            console.error("Error fetching scheduled challenges:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!upcomingChallenges || upcomingChallenges.length === 0) {
            return NextResponse.json({ message: "No upcoming challenges found" })
        }

        for (const challenge of upcomingChallenges) {
            const timeStr = new Date(challenge.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })

            // Tagging logic
            let p1Name = challenge.challenger.name
            let p2Name = challenge.opponent.name

            if (challenge.challenger.telegram) p1Name += ` (@${challenge.challenger.telegram})`
            if (challenge.opponent.telegram) p2Name += ` (@${challenge.opponent.telegram})`

            const msg = `⏰ **NHẮC NHỞ KÈO ĐẤU**\n\nTrận đấu giữa **${p1Name}** vs **${p2Name}** sắp diễn ra lúc **${timeStr}**!\n\nAnh em chuẩn bị vào vị trí chiến đấu nhé! 🎱`

            await sendTelegramMessage(msg)

            // Mark as sent
            await supabase
                .from('Challenge')
                .update({ reminder_sent: true })
                .eq('id', challenge.id)
        }

        return NextResponse.json({ success: true, processed: upcomingChallenges.length })

    } catch (e: any) {
        console.error("Cron Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
