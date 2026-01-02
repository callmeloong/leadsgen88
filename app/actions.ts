'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getPlayers() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from('Player')
        .select('*')
        .order('elo', { ascending: false })
        .order('wins', { ascending: false })

    if (error) {
        console.error('Error fetching players:', error)
        return []
    }

    return data
}

export async function createPlayer(name: string, email?: string) {
    if (!name.trim()) return { error: "Tên không được để trống" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    try {
        const payload: any = { name: name.trim() }
        if (email && email.trim()) {
            payload.email = email.trim()
        }

        const { error } = await supabase
            .from('Player')
            .insert([payload])

        if (error) throw error

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error creating player:', error)
        return { error: "Lỗi khi tạo người chơi (Có thể Email đã tồn tại)" }
    }
}

export async function createMatch(player1Id: string, player2Id: string, player1Score: number, player2Score: number) {
    if (!player1Id || !player2Id) return { error: "Cần chọn 2 người chơi" }
    if (player1Id === player2Id) return { error: "Người chơi phải khác nhau" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        // Fetch players to get current ELO
        const { data: p1, error: e1 } = await supabase.from('Player').select('*').eq('id', player1Id).single()
        const { data: p2, error: e2 } = await supabase.from('Player').select('*').eq('id', player2Id).single()

        if (e1 || e2 || !p1 || !p2) return { error: "Người chơi không tồn tại" }

        // Count total matches for K-Factor (Manual count since we don't have relation join easily yet)
        // For simplicity/performance in this migration, we will use wins + losses as approximation or fetch count
        // Fetch count correctly:
        const { count: p1Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${player1Id},player2Id.eq.${player1Id}`)
        const { count: p2Count } = await supabase.from('Match').select('*', { count: 'exact', head: true }).or(`player1Id.eq.${player2Id},player2Id.eq.${player2Id}`)

        const p1TotalMatches = p1Count || (p1.wins + p1.losses)
        const p2TotalMatches = p2Count || (p2.wins + p2.losses)

        // Logic ELO Calculation (Same as before)
        let s1, s2, winnerId: string | null = null;
        if (player1Score > player2Score) {
            s1 = 1; s2 = 0; winnerId = player1Id;
        } else if (player2Score > player1Score) {
            s1 = 0; s2 = 1; winnerId = player2Id;
        } else {
            s1 = 0.5; s2 = 0.5;
        }

        const scoreDiff = Math.abs(player1Score - player2Score)
        const marginFactor = scoreDiff > 0 ? Math.sqrt(scoreDiff) : 1

        const K1_Val = p1TotalMatches < 30 ? 32 : 16
        const K2_Val = p2TotalMatches < 30 ? 32 : 16

        const p1Expected = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400))
        const p2Expected = 1 / (1 + Math.pow(10, (p1.elo - p2.elo) / 400))

        const delta1 = Math.round(K1_Val * (s1 - p1Expected) * marginFactor)
        const delta2 = Math.round(K2_Val * (s2 - p2Expected) * marginFactor)

        const p1NewElo = p1.elo + delta1
        const p2NewElo = p2.elo + delta2

        // Perform Updates
        // 1. Insert Match
        const { error: matchError } = await supabase.from('Match').insert({
            player1Id,
            player2Id,
            player1Score,
            player2Score,
            winnerId,
            eloDelta1: delta1,
            eloDelta2: delta2
        })
        if (matchError) throw matchError

        // 2. Update P1
        const { error: p1UpdateError } = await supabase.from('Player').update({
            elo: p1NewElo,
            wins: p1.wins + (s1 === 1 ? 1 : 0),
            losses: p1.losses + (s1 === 0 ? 1 : 0)
        }).eq('id', player1Id)
        if (p1UpdateError) throw p1UpdateError

        // 3. Update P2
        const { error: p2UpdateError } = await supabase.from('Player').update({
            elo: p2NewElo,
            wins: p2.wins + (s2 === 1 ? 1 : 0),
            losses: p2.losses + (s2 === 0 ? 1 : 0)
        }).eq('id', player2Id)
        if (p2UpdateError) throw p2UpdateError

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Lỗi khi ghi nhận trận đấu" }
    }
}


export async function logout() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }
    await supabase.auth.signOut()
    revalidatePath('/')
    redirect('/')
}
