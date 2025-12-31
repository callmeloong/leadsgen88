'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getPlayers() {
    return await prisma.player.findMany({
        orderBy: [
            { elo: 'desc' },
            { wins: 'desc' }
        ]
    })
}

export async function createPlayer(name: string) {
    if (!name.trim()) return { error: "Tên không được để trống" }
    try {
        await prisma.player.create({
            data: { name: name.trim() }
        })
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Lỗi khi tạo người chơi" }
    }
}

export async function createMatch(player1Id: string, player2Id: string, player1Score: number, player2Score: number) {
    if (!player1Id || !player2Id) return { error: "Cần chọn 2 người chơi" }
    if (player1Id === player2Id) return { error: "Người chơi phải khác nhau" }
    // Allow draws? Assuming winner is determined by score. 
    // If draw, user didn't specify what to do. Assuming draw is possible if scores equal.
    // User example implies there is always a winner or score difference.

    try {
        const p1 = await prisma.player.findUnique({ where: { id: player1Id }, include: { matchesAsPlayer1: true, matchesAsPlayer2: true } })
        const p2 = await prisma.player.findUnique({ where: { id: player2Id }, include: { matchesAsPlayer1: true, matchesAsPlayer2: true } })

        if (!p1 || !p2) return { error: "Người chơi không tồn tại" }

        // Determine winner and S (actual score)
        let s1, s2, winnerId: string | null = null;
        if (player1Score > player2Score) {
            s1 = 1; s2 = 0; winnerId = player1Id;
        } else if (player2Score > player1Score) {
            s1 = 0; s2 = 1; winnerId = player2Id;
        } else {
            s1 = 0.5; s2 = 0.5; // Draw
        }

        // Calculate Margin of Victory Factor
        // Formula: Sqrt(Score Diff) (or similar as requested)
        // User suggesetd: Margin_of_Victory_Factor = sqrt(score_diff)
        // Let's use that. If draw, diff is 0, factor 0? No, standard ELO for draw doesn't use margin usually or margin is 1?
        // User example: "Win 7-3 (diff 4) -> Factor sqrt(4)=2".
        // If draw, diff 0. Sqrt(0)=0 -> No ELO change? That seems wrong for draws if rating diff exists.
        // Let's assume Margin Factor applies to the result.
        // If draw (diff=0), let's set Factor = 1 to fallback to standard ELO, or just use 1.
        const scoreDiff = Math.abs(player1Score - player2Score)
        const marginFactor = scoreDiff > 0 ? Math.sqrt(scoreDiff) : 1

        // Calculate K Factor
        // Rule: < 30 matches -> K=32. >= 30 matches -> K=16.
        const getK = (matches: number) => matches < 30 ? 32 : 16
        const k1 = getK(p1.wins + p1.losses) // Note: using wins+losses might be slightly off if draws exist not counted, but schema has wins/losses. 
        // Ideally count total matches.
        const p1TotalMatches = p1.matchesAsPlayer1.length + p1.matchesAsPlayer2.length
        const p2TotalMatches = p2.matchesAsPlayer1.length + p2.matchesAsPlayer2.length

        // Using user suggested values: Newbie (approx <30) K=32 (close to 30-40), Experienced K=16.
        const K1_Val = p1TotalMatches < 30 ? 32 : 16
        const K2_Val = p2TotalMatches < 30 ? 32 : 16

        // Calculate Expected Score (P)
        // P = 1 / (1 + 10^((OpponentElo - MyElo)/400))
        const p1Expected = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400))
        const p2Expected = 1 / (1 + Math.pow(10, (p1.elo - p2.elo) / 400))

        // Calculate Delta E
        // ΔE = K * (S - P) * MarginFactor
        const delta1 = Math.round(K1_Val * (s1 - p1Expected) * marginFactor)
        const delta2 = Math.round(K2_Val * (s2 - p2Expected) * marginFactor)

        const p1NewElo = p1.elo + delta1
        const p2NewElo = p2.elo + delta2

        await prisma.$transaction([
            prisma.match.create({
                data: {
                    player1Id,
                    player2Id,
                    player1Score,
                    player2Score,
                    winnerId
                }
            }),
            prisma.player.update({
                where: { id: player1Id },
                data: {
                    elo: p1NewElo,
                    wins: { increment: s1 === 1 ? 1 : 0 },
                    losses: { increment: s1 === 0 ? 1 : 0 }
                }
            }),
            prisma.player.update({
                where: { id: player2Id },
                data: {
                    elo: p2NewElo,
                    wins: { increment: s2 === 1 ? 1 : 0 },
                    losses: { increment: s2 === 0 ? 1 : 0 }
                }
            })
        ])

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Lỗi khi ghi nhận trận đấu" }
    }
}
