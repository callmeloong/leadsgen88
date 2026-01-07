
export type RankTier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER'

export const RANKS: Record<RankTier, { name: string, minElo: number, color: string, bgColor: string, borderColor: string }> = {
    IRON: { name: 'Sắt', minElo: 0, color: 'text-zinc-500', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500' },
    BRONZE: { name: 'Đồng', minElo: 1000, color: 'text-orange-700', bgColor: 'bg-orange-700/10', borderColor: 'border-orange-700' },
    SILVER: { name: 'Bạc', minElo: 1200, color: 'text-zinc-300', bgColor: 'bg-zinc-300/10', borderColor: 'border-zinc-300' },
    GOLD: { name: 'Vàng', minElo: 1400, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500' },
    PLATINUM: { name: 'Bạch Kim', minElo: 1600, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-cyan-400' },
    DIAMOND: { name: 'Kim Cương', minElo: 1800, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500' },
    MASTER: { name: 'Cao Thủ', minElo: 2000, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500' },
    GRANDMASTER: { name: 'Đại Cao Thủ', minElo: 2200, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500' }
}

export function getRank(elo: number) {
    const tiers: RankTier[] = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER']
    let currentRank = RANKS['IRON']

    for (const tier of tiers) {
        if (elo >= RANKS[tier].minElo) {
            currentRank = RANKS[tier]
        }
    }
    return currentRank
}

export function getTitles(stats: { matches: number, wins: number, winRate: number }) {
    const titles = []

    // Match Count Titles
    if (stats.matches >= 500) titles.push({ name: 'Huyền Thoại', color: 'text-purple-400', icon: '👑' })
    else if (stats.matches >= 200) titles.push({ name: 'Lão Tướng', color: 'text-red-400', icon: '⚔️' })
    else if (stats.matches >= 100) titles.push({ name: 'Chiến Binh', color: 'text-orange-400', icon: '🛡️' })
    else if (stats.matches >= 50) titles.push({ name: 'Người Mới', color: 'text-green-400', icon: '🌱' })

    // Win Rate Titles (min 20 matches)
    if (stats.matches >= 20 && stats.winRate >= 70) titles.push({ name: 'Độc Cô Cầu Bại', color: 'text-red-600 font-black', icon: '🔥' })
    else if (stats.matches >= 20 && stats.winRate >= 60) titles.push({ name: 'Sát Thủ', color: 'text-red-500', icon: '🗡️' })
    else if (stats.matches >= 20 && stats.winRate >= 50) titles.push({ name: 'Tay To', color: 'text-blue-500', icon: '💪' })

    // Special
    if (stats.matches >= 10 && stats.wins === stats.matches) titles.push({ name: 'Bất Bại', color: 'text-yellow-500 animate-pulse', icon: '🏆' })

    return titles
}
