
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendTelegramMessage, escapeHtml } from '@/lib/telegram'

export async function createMatchService(player1Id: string, player2Id: string, player1Score: number, player2Score: number) {
    if (!player1Id || !player2Id) return { error: "Cần chọn 2 người chơi" }
    if (player1Id === player2Id) return { error: "Người chơi phải khác nhau" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    try {
        const { data: p1, error: e1 } = await supabase.from('Player').select('*').eq('id', player1Id).single()
        const { data: p2, error: e2 } = await supabase.from('Player').select('*').eq('id', player2Id).single()

        if (e1 || e2 || !p1 || !p2) return { error: "Người chơi không tồn tại" }

        const isPending = !isAdmin
        const status = isPending ? 'PENDING' : 'APPROVED'

        let delta1 = 0, delta2 = 0, winnerId: string | null = null;
        if (player1Score > player2Score) winnerId = player1Id;
        else if (player2Score > player1Score) winnerId = player2Id;

        if (!isPending) {
            const { count: p1Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${player1Id},player2Id.eq.${player1Id}`).eq('status', 'APPROVED')
            const { count: p2Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${player2Id},player2Id.eq.${player2Id}`).eq('status', 'APPROVED')

            const p1Total = p1Count || 0
            const p2Total = p2Count || 0

            let s1, s2;
            if (player1Score > player2Score) { s1 = 1; s2 = 0; }
            else if (player2Score > player1Score) { s1 = 0; s2 = 1; }
            else { s1 = 0.5; s2 = 0.5; }

            const scoreDiff = Math.abs(player1Score - player2Score)
            const marginFactor = scoreDiff > 0 ? Math.sqrt(scoreDiff) : 1
            const K1_Val = p1Total < 30 ? 32 : 16
            const K2_Val = p2Total < 30 ? 32 : 16

            const p1Expected = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400))
            const p2Expected = 1 / (1 + Math.pow(10, (p1.elo - p2.elo) / 400))

            delta1 = Math.round(K1_Val * (s1 - p1Expected) * marginFactor)
            delta2 = Math.round(K2_Val * (s2 - p2Expected) * marginFactor)
        }

        const { error: matchError } = await supabase.from('Match').insert({
            player1Id,
            player2Id,
            player1Score,
            player2Score,
            winnerId,
            eloDelta1: delta1,
            eloDelta2: delta2,
            status: status,
            submitterId: user.id
        }).select().single()

        if (matchError) throw matchError

        const notificationText = isPending
            ? `⚠️ <b>KÈO MỚI!</b>\n\nNgười gửi: ${escapeHtml(user.user_metadata?.name || 'Ai đó')}\nTrận đấu: ${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}\nTỉ số: ${player1Score} - ${player2Score}\n\n👉 Vào app xác nhận ngay!`
            : `✅ <b>KẾT QUẢ:</b>\n\n${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}\nTỉ số: ${player1Score} - ${player2Score}\n\nELO: ${escapeHtml(p1.name)} (${delta1 > 0 ? '+' : ''}${delta1}), ${escapeHtml(p2.name)} (${delta2 > 0 ? '+' : ''}${delta2})`

        await sendTelegramMessage(notificationText)

        if (!isPending) {
            let s1 = 0, s2 = 0;
            if (player1Score > player2Score) s1 = 1;
            else if (player2Score > player1Score) s2 = 1;

            await supabase.from('Player').update({
                elo: p1.elo + delta1,
                wins: p1.wins + s1,
                losses: p1.losses + (s1 === 0 && player1Score !== player2Score ? 1 : 0)
            }).eq('id', player1Id)

            await supabase.from('Player').update({
                elo: p2.elo + delta2,
                wins: p2.wins + s2,
                losses: p2.losses + (s2 === 0 && player1Score !== player2Score ? 1 : 0)
            }).eq('id', player2Id)
        }

        revalidatePath('/')
        return { success: true, pending: isPending }
    } catch (error) {
        console.error(error)
        return { error: "Lỗi khi ghi nhận trận đấu" }
    }
}

export async function confirmMatchService(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }

    const { data: match, error: fetchError } = await supabase
        .from('Match')
        .select('*, player1:player1Id(*), player2:player2Id(*)')
        .eq('id', matchId)
        .single()

    if (fetchError || !match) return { error: "Match not found" }
    if (match.status === 'APPROVED') return { error: "Match already approved" }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'
    const isSubmitter = match.submitterId === user.id

    const isPlayer1 = match.player1Id === user.id
    const isPlayer2 = match.player2Id === user.id

    if (!isAdmin) {
        if (!isPlayer1 && !isPlayer2) return { error: "You are not involved in this match" }
        if (isSubmitter) return { error: "You cannot verify your own submission" }
    }

    const p1 = match.player1
    const p2 = match.player2
    const { count: p1Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${p1.id},player2Id.eq.${p1.id}`).eq('status', 'APPROVED')
    const { count: p2Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${p2.id},player2Id.eq.${p2.id}`).eq('status', 'APPROVED')

    const p1Total = p1Count || 0
    const p2Total = p2Count || 0

    let s1, s2;
    if (match.player1Score > match.player2Score) { s1 = 1; s2 = 0; }
    else if (match.player2Score > match.player1Score) { s1 = 0; s2 = 1; }
    else { s1 = 0.5; s2 = 0.5; }

    const scoreDiff = Math.abs(match.player1Score - match.player2Score)
    const marginFactor = scoreDiff > 0 ? Math.sqrt(scoreDiff) : 1
    const K1_Val = p1Total < 30 ? 32 : 16
    const K2_Val = p2Total < 30 ? 32 : 16

    const p1Expected = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400))
    const p2Expected = 1 / (1 + Math.pow(10, (p1.elo - p2.elo) / 400))

    const delta1 = Math.round(K1_Val * (s1 - p1Expected) * marginFactor)
    const delta2 = Math.round(K2_Val * (s2 - p2Expected) * marginFactor)

    await supabase.from('Match').update({
        status: 'APPROVED',
        eloDelta1: delta1,
        eloDelta2: delta2,
        updatedAt: new Date().toISOString()
    }).eq('id', matchId)

    const msg = `✅ <b>KÈO ĐÃ CHỐT!</b>\n\n${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}\nTỉ số: ${match.player1Score} - ${match.player2Score}\n\nELO: ${escapeHtml(p1.name)} (${delta1 > 0 ? '+' : ''}${delta1}), ${escapeHtml(p2.name)} (${delta2 > 0 ? '+' : ''}${delta2})`
    await sendTelegramMessage(msg)

    await supabase.from('Player').update({
        elo: p1.elo + delta1,
        wins: p1.wins + (s1 === 1 ? 1 : 0),
        losses: p1.losses + (s1 === 0 && s2 === 1 ? 1 : 0)
    }).eq('id', p1.id)

    await supabase.from('Player').update({
        elo: p2.elo + delta2,
        wins: p2.wins + (s2 === 1 ? 1 : 0),
        losses: p2.losses + (s2 === 0 && s1 === 1 ? 1 : 0)
    }).eq('id', p2.id)

    revalidatePath('/')
    return { success: true }
}

export async function rejectMatchService(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }

    const { data: match } = await supabase.from('Match').select('*').eq('id', matchId).single()
    if (!match) return { error: "Match not found" }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    const isInvolved = match.player1Id === user.id || match.player2Id === user.id

    if (!isAdmin && !isInvolved) return { error: "Unauthorized" }

    const { error } = await supabase.from('Match').delete().eq('id', matchId)
    if (error) return { error: "Failed to reject match" }

    revalidatePath('/')
    return { success: true }
}

export async function updateMatchScoreService(matchId: string, player1Score: number, player2Score: number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }

    const { data: match } = await supabase.from('Match').select('*').eq('id', matchId).single()
    if (!match) return { error: "Match not found" }

    if (match.status !== 'LIVE') return { error: "Trận đấu đã kết thúc hoặc đang chờ xác nhận" }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    let isAuthorized = false
    if (match.player1Id === user.id || match.player2Id === user.id) isAuthorized = true

    if (!isAuthorized) {
        const { data: p1 } = await supabase.from('Player').select('email').eq('id', match.player1Id).single()
        const { data: p2 } = await supabase.from('Player').select('email').eq('id', match.player2Id).single()

        if ((p1 && p1.email === user.email) || (p2 && p2.email === user.email)) {
            isAuthorized = true
        }
    }

    if (!isAdmin && !isAuthorized) {
        return { error: "Bạn không có quyền cập nhật tỉ số trận này" }
    }

    await supabase.from('Match').update({
        player1Score,
        player2Score
    }).eq('id', matchId)

    revalidatePath(`/live/${matchId}`)
    revalidatePath('/')
    return { success: true }
}

export async function finishMatchService(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }

    const { data: match, error: fetchError } = await supabase
        .from('Match')
        .select('*, player1:player1Id(*), player2:player2Id(*)')
        .eq('id', matchId)
        .single()

    if (fetchError || !match) return { error: "Match not found" }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    let isAuthorized = false
    if (match.player1Id === user.id || match.player2Id === user.id) isAuthorized = true

    if (!isAuthorized) {
        const { data: p1 } = await supabase.from('Player').select('email').eq('id', match.player1Id).single()
        const { data: p2 } = await supabase.from('Player').select('email').eq('id', match.player2Id).single()
        if ((p1 && p1.email === user.email) || (p2 && p2.email === user.email)) isAuthorized = true
    }

    if (!isAdmin && !isAuthorized) {
        return { error: "Bạn không tham gia trận đấu này" }
    }

    if (match.status === 'LIVE') {
        const { error } = await supabase.from('Match').update({
            status: 'WAITING_CONFIRMATION',
            submitterId: user.id,
            updatedAt: new Date().toISOString()
        }).eq('id', matchId)

        if (error) return { error: "Lỗi khi gửi yêu cầu kết thúc" }

        let submitterIsP1 = match.player1Id === user.id;
        if (match.player1Id !== user.id && match.player2Id !== user.id) {
            if (match.player1.email === user.email) {
                submitterIsP1 = true;
            }
        }

        const opponent = submitterIsP1 ? match.player2 : match.player1
        const submitterName = submitterIsP1 ? match.player1.name : match.player2.name

        let msg = `⚠️ <b>XÁC NHẬN KẾT QUẢ</b>\n\n<b>${escapeHtml(submitterName)}</b> báo cáo tỉ số:\n<b>${escapeHtml(match.player1.name)}</b> ${match.player1Score} - ${match.player2Score} <b>${escapeHtml(match.player2.name)}</b>\n\n👉 ${escapeHtml(opponent.name)} vui lòng vào xác nhận!`

        if (opponent.telegram) msg += ` (@${opponent.telegram})`
        await sendTelegramMessage(msg)

        revalidatePath(`/live/${matchId}`)
        return { success: true, message: "Đã gửi yêu cầu xác nhận!" }
    }

    if (match.status === 'WAITING_CONFIRMATION') {
        if (!isAdmin && match.submitterId === user.id) {
            return { error: "Đang chờ đối thủ xác nhận" }
        }

        const p1 = match.player1
        const p2 = match.player2

        const { count: p1Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${p1.id},player2Id.eq.${p1.id}`).eq('status', 'APPROVED')
        const { count: p2Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${p2.id},player2Id.eq.${p2.id}`).eq('status', 'APPROVED')

        const p1Total = p1Count || 0
        const p2Total = p2Count || 0

        let s1, s2;
        if (match.player1Score > match.player2Score) { s1 = 1; s2 = 0; }
        else if (match.player2Score > match.player1Score) { s1 = 0; s2 = 1; }
        else { s1 = 0.5; s2 = 0.5; }

        const scoreDiff = Math.abs(match.player1Score - match.player2Score)
        const marginFactor = scoreDiff > 0 ? Math.sqrt(scoreDiff) : 1
        const K1_Val = p1Total < 30 ? 32 : 16
        const K2_Val = p2Total < 30 ? 32 : 16

        const p1Expected = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400))
        const p2Expected = 1 / (1 + Math.pow(10, (p1.elo - p2.elo) / 400))

        const delta1 = Math.round(K1_Val * (s1 - p1Expected) * marginFactor)
        const delta2 = Math.round(K2_Val * (s2 - p2Expected) * marginFactor)

        await supabase.from('Match').update({
            status: 'APPROVED',
            eloDelta1: delta1,
            eloDelta2: delta2,
            updatedAt: new Date().toISOString()
        }).eq('id', matchId)

        const msg = `🏁 <b>TRẬN ĐẤU KẾT THÚC!</b>\n\n<b>${escapeHtml(p1.name)}</b> vs <b>${escapeHtml(p2.name)}</b>\nTỉ số: ${match.player1Score} - ${match.player2Score}\n\nELO Update: ${escapeHtml(p1.name)} (${delta1 > 0 ? '+' : ''}${delta1}), ${escapeHtml(p2.name)} (${delta2 > 0 ? '+' : ''}${delta2})`
        await sendTelegramMessage(msg)

        await supabase.from('Player').update({
            elo: p1.elo + delta1,
            wins: p1.wins + (s1 === 1 ? 1 : 0),
            losses: p1.losses + (s1 === 0 && s2 === 1 ? 1 : 0)
        }).eq('id', p1.id)

        await supabase.from('Player').update({
            elo: p2.elo + delta2,
            wins: p2.wins + (s2 === 1 ? 1 : 0),
            losses: p2.losses + (s2 === 0 && s1 === 1 ? 1 : 0)
        }).eq('id', p2.id)

        revalidatePath('/')
        return { success: true }
    }

    return { error: "Trạng thái trận đấu không hợp lệ" }
}

export async function initializeLiveMatchService(challengeId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: challenge } = await supabase.from('Challenge').select('*, challenger:challengerId(*), opponent:opponentId(*)').eq('id', challengeId).single()
    if (!challenge) return { error: "Challenge not found" }

    const { data: existingMatch } = await supabase
        .from('Match')
        .select('id')
        .eq('player1Id', challenge.challengerId)
        .eq('player2Id', challenge.opponentId)
        .eq('status', 'LIVE')
        .single()

    if (existingMatch) {
        redirect(`/live/${existingMatch.id}`)
    }

    const initialP2Score = challenge.handicap || 0

    const { data: newMatch, error } = await supabase.from('Match').insert({
        player1Id: challenge.challengerId,
        player2Id: challenge.opponentId,
        player1Score: 0,
        player2Score: initialP2Score,
        status: 'LIVE',
        scheduled_time: challenge.scheduled_time
    }).select().single()

    if (error || !newMatch) {
        return { error: "Failed to create match" }
    }

    redirect(`/live/${newMatch.id}`)
}

export async function cancelLiveMatchService(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: match } = await supabase
        .from('Match')
        .select(`
            *,
            player1:player1Id(*),
            player2:player2Id(*)
        `)
        .eq('id', matchId)
        .single()

    if (!match) return { error: "Trận đấu không tồn tại" }
    if (match.status !== 'LIVE') return { error: "Trận đấu không thể hủy" }

    let cancellerId = null
    let opponentId = null
    let cancellerName = ''
    let opponentName = ''
    let cancellerIsP1 = false

    if (match.player1Id === user.id) {
        cancellerId = match.player1Id
        opponentId = match.player2Id
        cancellerName = match.player1.name
        opponentName = match.player2.name
        cancellerIsP1 = true
    } else if (match.player2Id === user.id) {
        cancellerId = match.player2Id
        opponentId = match.player1Id
        cancellerName = match.player2.name
        opponentName = match.player1.name
        cancellerIsP1 = false
    } else {
        if (match.player1.email === user.email) {
            cancellerId = match.player1Id
            opponentId = match.player2Id
            cancellerName = match.player1.name
            opponentName = match.player2.name
            cancellerIsP1 = true
        } else if (match.player2.email === user.email) {
            cancellerId = match.player2Id
            opponentId = match.player1Id
            cancellerName = match.player2.name
            opponentName = match.player2.name
            cancellerIsP1 = false
        } else {
            return { error: "Bạn không tham gia trận đấu này" }
        }
    }

    const { data: p1 } = await supabase.from('Player').select('elo').eq('id', cancellerId).single()
    const { data: p2 } = await supabase.from('Player').select('elo').eq('id', opponentId).single()

    if (p1 && p2) {
        await supabase.from('Player').update({ elo: p1.elo - 20 }).eq('id', cancellerId)
        await supabase.from('Player').update({ elo: p2.elo + 20 }).eq('id', opponentId)
    }

    const { error: updateError } = await supabase
        .from('Match')
        .update({
            status: 'CANCELLED',
            eloDelta1: cancellerIsP1 ? -20 : 20,
            eloDelta2: cancellerIsP1 ? 20 : -20,
            updatedAt: new Date().toISOString()
        })
        .eq('id', matchId)

    if (updateError) return { error: "Lỗi khi hủy trận đấu" }

    let msg = `🚫 <b>TRẬN ĐẤU ĐÃ BỊ HỦY!</b>\n\n`
    msg += `Người hủy: <b>${escapeHtml(cancellerName)}</b>\n`
    msg += `Lý do: <i>\"Sợ quá bỏ chạy\"</i> (hoặc có việc bận) 🐔\n\n`
    msg += `📉 <b>${escapeHtml(cancellerName)}</b> bị phạt: <b style="color:red">-20 Elo</b>\n`
    msg += `📈 <b>${escapeHtml(opponentName)}</b> được tặng: <b style="color:green">+20 Elo</b>`

    await sendTelegramMessage(msg)

    revalidatePath('/')
    revalidatePath(`/live/${matchId}`)

    return { success: true }
}
