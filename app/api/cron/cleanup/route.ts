import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramMessage } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = createAdminClient()
        const now = new Date().toISOString()

        // Find EXPIRED OPEN Challenges
        // Logic: status = 'OPEN' AND scheduled_time < now AND scheduled_time IS NOT NULL
        // Note: Challenges with null scheduled_time are "Anytime" so they don't expire.

        const { data: expiredChallenges, error } = await supabase
            .from('Challenge')
            .select(`
                *,
                challenger:challengerId(name)
            `)
            .eq('status', 'OPEN')
            .lt('scheduled_time', now)
            .not('scheduled_time', 'is', null)

        if (error) {
            console.error("Error fetching expired challenges:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!expiredChallenges || expiredChallenges.length === 0) {
            return NextResponse.json({ message: "No expired challenges found" })
        }

        for (const challenge of expiredChallenges) {
            // Update status to REJECTED
            const { error: updateError } = await supabase
                .from('Challenge')
                .update({
                    status: 'REJECTED',
                    // Optional: Add a system note? 'Expired'
                })
                .eq('id', challenge.id)

            if (updateError) {
                console.error(`Failed to reject challenge ${challenge.id}`, updateError)
                continue
            }

            // Optional: Notify Telegram to keep channel clean/informed?
            // "🚫 Kèo thơm của A đã hết hạn!"
            // const msg = `🚫 <b>KÈO QUÁ HẠN!</b>\n\nLời thách đấu của <b>${challenge.challenger.name}</b> đã tự động hủy do quá thời gian hẹn.`
            // await sendTelegramMessage(msg)
        }

        return NextResponse.json({
            success: true,
            processed: expiredChallenges.length,
            message: `Cleaned up ${expiredChallenges.length} expired challenges`
        })

    } catch (e: any) {
        console.error("Cleanup Cron Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
