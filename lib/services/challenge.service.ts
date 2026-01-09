
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

export async function issueChallengeService(opponentId: string, message?: string, scheduledTime?: string, gameType?: string, raceTo?: number, handicap?: number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: challenger } = await supabase.from('Player').select('*').eq('email', user.email).single()
    if (!challenger) return { error: "Không tìm thấy thông tin người chơi của bạn" }

    if (challenger.id === opponentId) return { error: "Không thể tự thách đấu bản thân" }

    const { data: opponent } = await supabase.from('Player').select('*').eq('id', opponentId).single()
    if (!opponent) return { error: "Đối thủ không tồn tại" }

    const { error } = await supabase.from('Challenge').insert({
        challengerId: challenger.id,
        opponentId: opponentId,
        status: 'PENDING',
        message: message,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        game_type: gameType,
        race_to: raceTo,
        handicap: handicap
    })

    if (error) return { error: "Lỗi khi gửi lời thách đấu" }

    let opponentName = `<b>${escapeHtml(opponent.name)}</b>`
    if (opponent.telegram) {
        opponentName += ` (@${escapeHtml(opponent.telegram)})`
    }

    let msg = `⚔️ <b>LỜI TUYÊN CHIẾN!</b>\n\n<b>${escapeHtml(challenger.name)}</b> vừa thách đấu ${opponentName}.`

    if (gameType) msg += `\n🎱 Thể thức: <b>${escapeHtml(gameType)}</b>`
    if (raceTo && raceTo > 0) msg += `\n🎯 Chạm: <b>${raceTo}</b>`
    if (handicap && handicap > 0) msg += `\n⚖️ Chấp: <b>${handicap} ván</b> (cho đối thủ)`

    if (scheduledTime) {
        const date = new Date(scheduledTime)
        const timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
        msg += `\n\n⏰ Thời gian: <b>${timeStr}</b>`
    }

    if (message) {
        msg += `\n💬 Lời nhắn: "${escapeHtml(message)}"`
    }
    msg += `\n\n👉 <a href="https://leadsgen88.longth.dev">Vào app để nhận kèo ngay!</a>`

    await sendTelegramMessage(msg)

    revalidatePath('/')
    revalidatePath(`/player/${opponentId}`)
    return { success: true }
}

export async function respondChallengeService(challengeId: string, accept: boolean) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: challenge } = await supabase
        .from('Challenge')
        .select(`*, challenger:challengerId(name), opponent:opponentId(name, email)`)
        .eq('id', challengeId)
        .single()

    if (!challenge) return { error: "Không tìm thấy lời thách đấu" }

    if (challenge.opponent.email !== user.email) return { error: "Bạn không có quyền xử lý thách đấu này" }

    if (challenge.status !== 'PENDING') return { error: "Lời thách đấu này đã được xử lý" }

    const newStatus = accept ? 'ACCEPTED' : 'REJECTED'

    const { error } = await supabase
        .from('Challenge')
        .update({ status: newStatus })
        .eq('id', challengeId)

    if (error) return { error: "Lỗi khi cập nhật trạng thái" }

    if (accept) {
        const initialP2Score = challenge.handicap || 0

        const { error: matchError } = await supabase.from('Match').insert({
            player1Id: challenge.challengerId,
            player2Id: challenge.opponentId,
            player1Score: 0,
            player2Score: initialP2Score,
            status: 'LIVE',
            scheduled_time: challenge.scheduled_time
        })

        if (matchError) {
            console.error("Error creating live match:", matchError)
            return { error: "Lỗi khi tạo trận đấu Live" }
        }

        let msg = `🔥 <b>KÈO ĐÃ NHẬN!</b>\n\n<b>${escapeHtml(challenge.opponent.name)}</b>: "Ok chiến luôn!"\nTrận đấu: <b>${escapeHtml(challenge.challenger.name)}</b> vs <b>${escapeHtml(challenge.opponent.name)}</b>.`

        if (challenge.game_type) msg += `\n🎱 ${challenge.game_type}`
        if (challenge.race_to) msg += ` | 🎯 Chạm ${challenge.race_to}`
        if (initialP2Score > 0) msg += ` | ⚖️ Chấp ${initialP2Score}`

        msg += `\n\n🔴 <b>LIVE MATCH IS READY!</b>\nAnh em chuẩn bị xem live tỉ số nhé! 🍿`

        await sendTelegramMessage(msg)
    } else {
        const taunts = [
            "HÈN! 🐔",
            "Sợ à? 😏",
            "Chạy ngay đi! 🏃‍♂️",
            "Không dám nhận kèo sao? 😂",
            "Thôi tha cho đó! 😌",
            "Yếu đuối! 💪❌"
        ]
        const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)]
        const msg = `🚫 <b>KÈO BỊ TỪ CHỐI!</b>\n\n<b>${escapeHtml(challenge.opponent.name)}</b> đã từ chối lời thách đấu của <b>${escapeHtml(challenge.challenger.name)}</b>.\n\n> "${randomTaunt}"`
        await sendTelegramMessage(msg)
    }

    revalidatePath('/')
    return { success: true }
}

export async function issueOpenChallengeService(message?: string, scheduledTime?: string, gameType?: string, raceTo?: number, handicap?: number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: challenger } = await supabase.from('Player').select('*').eq('email', user.email).single()
    if (!challenger) return { error: "Không tìm thấy thông tin người chơi của bạn" }

    const { error } = await supabase.from('Challenge').insert({
        challengerId: challenger.id,
        opponentId: null,
        status: 'OPEN',
        message: message,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        game_type: gameType,
        race_to: raceTo,
        handicap: handicap
    })

    if (error) {
        console.error("Open Challenge Error:", error)
        return { error: "Lỗi khi tạo kèo" }
    }

    let msg = `🔥 \u003cb\u003eKÈO THƠM (OPEN CHALLENGE)!\u003c/b\u003e\n\n\u003cb\u003e${escapeHtml(challenger.name)}\u003c/b\u003e vừa tung ra một lời thách đấu mở!`

    if (gameType) msg += `\n🎱 Thể thức: <b>${escapeHtml(gameType)}</b>`
    if (raceTo && raceTo > 0) msg += `\n🎯 Chạm: <b>${raceTo}</b>`
    if (handicap && handicap > 0) msg += `\n⚖️ Chấp: <b>${handicap} ván</b> (cho đối thủ)`

    if (scheduledTime) {
        const date = new Date(scheduledTime)
        const timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
        msg += `\n\n⏰ Thời gian: \u003cb\u003e${timeStr}\u003c/b\u003e`
    }

    if (message) {
        msg += `\n💬 Lời nhắn: "${escapeHtml(message)}"`
    }

    msg += `\n\n🚀 \u003ca href="https://leadsgen88.longth.dev"\u003eVào nhận kèo ngay kẻo lỡ!\u003c/a\u003e`

    await sendTelegramMessage(msg)

    revalidatePath('/')
    return { success: true }
}

export async function acceptOpenChallengeService(challengeId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: player } = await supabase.from('Player').select('*').eq('email', user.email).single()
    if (!player) return { error: "Player not found" }

    const { data: challenge, error } = await supabase
        .from('Challenge')
        .update({
            opponentId: player.id,
            status: 'ACCEPTED'
        })
        .eq('id', challengeId)
        .is('opponentId', null)
        .select(`
            *,
            challenger:challengerId(name, telegram)
        `)
        .single()

    if (error || !challenge) {
        return { error: "Kèo này đã bị người khác nhận hoặc không tồn tại!" }
    }

    let msg = `✅ \u003cb\u003eKÈO ĐÃ ĐƯỢC NHẬN!\u003c/b\u003e\n\n\u003cb\u003e${escapeHtml(player.name)}\u003c/b\u003e đã chấp nhận lời thách đấu của \u003cb\u003e${escapeHtml(challenge.challenger.name)}\u003c/b\u003e.`
    msg += `\n\nTrận đấu đã được lên lịch!`

    await sendTelegramMessage(msg)

    revalidatePath('/')
    return { success: true }
}

import { cancelLiveMatchService } from './match.service'

export async function cancelChallengeService(challengeId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: challenge } = await supabase
        .from('Challenge')
        .select('*')
        .eq('id', challengeId)
        .single()

    if (!challenge) return { error: "Không tìm thấy lời thách đấu" }

    if (challenge.status !== 'ACCEPTED') return { error: "Chỉ có thể hủy kèo đã nhận" }

    const isParticipant = (challenge.challengerId === user.id) || (challenge.opponentId === user.id)
    if (!isParticipant) {
        const { data: player } = await supabase.from('Player').select('id').eq('email', user.email).single()
        if (!player || (player.id !== challenge.challengerId && player.id !== challenge.opponentId)) {
            return { error: "Bạn không tham gia kèo này" }
        }
    }

    const { data: match } = await supabase
        .from('Match')
        .select('id')
        .eq('player1Id', challenge.challengerId)
        .eq('player2Id', challenge.opponentId)
        .eq('status', 'LIVE')
        .single()

    if (match) {
        const result = await cancelLiveMatchService(match.id)
        if (result.error) return result
    }

    const { error } = await supabase
        .from('Challenge')
        .update({ status: 'CANCELLED' })
        .eq('id', challengeId)

    if (error) return { error: "Lỗi khi cập nhật trạng thái kèo" }

    revalidatePath('/')
    return { success: true }
}
