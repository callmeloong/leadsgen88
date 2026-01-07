
export async function cancelLiveMatch(matchId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    // Fetch match with players to get names and current Elos
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

    // Identify who is cancelling
    let cancellerId = null
    let opponentId = null
    let cancellerName = ''
    let opponentName = ''
    let cancellerIsP1 = false

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
        opponentName = match.player1.name
        cancellerIsP1 = false
    } else {
        return { error: "Bạn không tham gia trận đấu này" }
    }

    // Apply Elo Penalty: -20 for Canceller, +20 for Opponent
    // We update the PLAYERS table directly.
    // Also record the delta in the Match for history (optional, or we just rely on Cancelled status)
    // To keep history clear, let's update match with elo deltas too? 
    // Schema might not allow updating eloDelta on Cancelled? 
    // Let's assume we can update columns.

    // 1. Update Canceller
    const { error: err1 } = await supabase.rpc('increment_elo', {
        player_id: cancellerId,
        elo_delta: -20
    })

    // 2. Update Opponent
    const { error: err2 } = await supabase.rpc('increment_elo', {
        player_id: opponentId,
        elo_delta: 20
    })

    if (err1 || err2) {
        console.error("Elo update failed", err1, err2)
        // Continue to cancel match regardless? Or fail? 
        // Better to fail safety but let's proceed to cancel so they aren't stuck.
    }

    // 3. Update Match Status
    const { error: updateError } = await supabase
        .from('Match')
        .update({
            status: 'CANCELLED',
            eloDelta1: cancellerIsP1 ? -20 : 20,
            eloDelta2: cancellerIsP1 ? 20 : -20,
            // Maybe add a note or message?
        })
        .eq('id', matchId)

    if (updateError) return { error: "Lỗi khi hủy trận đấu" }

    // 4. Notify Telegram
    let msg = `🚫 <b>TRẬN ĐẤU ĐÃ BỊ HỦY!</b>\n\n`
    msg += `Người hủy: <b>${escapeHtml(cancellerName)}</b>\n`
    msg += `Lý do: <i>"Sợ quá bỏ chạy"</i> (hoặc có việc bận) 🐔\n\n`
    msg += `📉 <b>${escapeHtml(cancellerName)}</b> bị phạt: <b style="color:red">-20 Elo</b>\n`
    msg += `📈 <b>${escapeHtml(opponentName)}</b> được tặng: <b style="color:green">+20 Elo</b>`

    await sendTelegramMessage(msg)

    revalidatePath('/')
    revalidatePath(`/live/${matchId}`)

    return { success: true }
}
