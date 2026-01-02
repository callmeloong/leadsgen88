
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trophy, Swords } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EloChart } from '@/components/EloChart'
import { EditProfileDialog } from '@/components/EditProfileDialog'
import { ChallengeButton } from '@/components/ChallengeButton'

export const dynamic = 'force-dynamic'

export default async function PlayerProfile({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetch Player Info
    const { data: player } = await supabase
        .from('Player')
        .select('*')
        .eq('id', id)
        .single()

    if (!player) return notFound()

    // Fetch Match History
    const { data: matches } = await supabase
        .from('Match')
        .select(`
            *,
            player1:player1Id(name),
            player2:player2Id(name)
        `)
        .or(`player1Id.eq.${id},player2Id.eq.${id}`)
        .order('createdAt', { ascending: false })
        .limit(20)

    const totalMatches = player.wins + player.losses
    const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0

    // Calculate ELO History
    let currentElo = player.elo
    const eloHistory = [{ date: 'Now', elo: currentElo }]

    // Work backwards
    matches?.forEach((match: any) => {
        const isP1 = match.player1Id === id
        const eloChange = isP1 ? match.eloDelta1 : match.eloDelta2
        
        // ELO before this match = Current ELO - Change
        // Example: Now 1200, Match +20 => Before was 1180
        const previousElo = currentElo - eloChange
        
        eloHistory.push({
            date: new Date(match.createdAt).toLocaleDateString(),
            elo: previousElo // This becomes the "current" for the next iteration step backwards? 
                             // Wait, no. We are stepping back in time.
                             // Match N (Latest): Elo After = 1200. Elo Change = +20. Elo Before = 1180.
                             // Match N-1: Elo After = 1180. Elo Change = -10. Elo Before = 1190.
                             
        })
        currentElo = previousElo
    })

    // Remove the last "Now" entry if we have matches, because we want the history timeline. 
    // Actually, "Now" is a valid point. 
    // But the loop generates "Elo BEFORE match".
    // So the array serves as points: [Latest ELO, ELO before Match 1, ELO before Match 2...]
    
    // Let's refine for the chart. 
    // We want chronological: Match 1 End -> Match 2 End -> Match 3 End ... -> Current.
    
    // Let's reconstruct chronologically.
    // 1. Get ALL matches (or limit 100) sorted OLD to NEW.
    // But we only fetched limit 20 DESC.
    // If we only have recent 20 matches, we can only trace back 20 steps.
    // The "start" of the chart will be "ELO 20 matches ago".
    
    // Correct logic with partial history:
    // 1. Start from Current Player ELO.
    // 2. Iterate backwards through recent matches.
    // 3. Store points.
    
    // Verify Identity
    const { data: { user } } = await supabase.auth.getUser()
    const isOwnProfile = user?.email === player.email

    const formatNameWithNickname = (name: string, nickname: string | null, placement: string = 'middle') => {
        if (!nickname) return name
        const parts = name.trim().split(' ')
        
        const NicknameSpan = () => (
            <span className="text-2xl text-yellow-500 font-handjet font-normal whitespace-pre mx-1">
                "{nickname}"
            </span>
        )

        // Single word name -> always append at end
        if (parts.length === 1) {
             return (
                <div className="flex items-center">
                    {name} <NicknameSpan />
                </div>
             )
        }
        
        // Multi-word name
        if (placement === 'last') {
             return (
                <div className="flex items-center flex-wrap">
                    {name} <NicknameSpan />
                </div>
             )
        } else if (placement === 'first') {
            // After surname (first word)
            const firstName = parts.shift()
            const rest = parts.join(' ')
            return (
                <div className="flex items-center flex-wrap">
                    {firstName} <NicknameSpan /> {rest}
                </div>
            )
        } else {
             // Middle (Default) -> insert before last word
            const lastName = parts.pop()
            const otherNames = parts.join(' ')
            return (
                <div className="flex items-center flex-wrap">
                    {otherNames} <NicknameSpan /> {lastName}
                </div>
            )
        }
    }


    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leaderboard
            </Link>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-primary/20 bg-card/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-4xl font-black uppercase tracking-wider flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-3">
                                {formatNameWithNickname(player.name, player.nickname, player.nickname_placement)}
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xl px-3 py-1 border-primary text-primary">
                                    ELO: {player.elo}
                                </Badge>
                                {isOwnProfile && <EditProfileDialog player={player} />}
                            </div>
                        </CardTitle>
                        {!isOwnProfile && <ChallengeButton player={player} />}
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-background/50 rounded-lg">
                            <div className="text-3xl font-bold">{totalMatches}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Matches</div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-lg">
                            <div className="text-3xl font-bold text-green-500">{player.wins}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Wins</div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-lg">
                            <div className="text-3xl font-bold text-yellow-500">{winRate}%</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="flex items-center justify-center p-6 border-border bg-card/50">
                     <Trophy className="w-24 h-24 text-primary/20" />
                </Card>
            </div>

            {/* ELO Chart */}
            <EloChart data={eloHistory} />

            {/* Match History */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="uppercase tracking-wider">Match History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">RESULT</TableHead>
                                <TableHead className="font-bold">OPPONENT</TableHead>
                                <TableHead className="text-center font-bold">SCORE</TableHead>
                                <TableHead className="text-right font-bold">ELO CHANGE</TableHead>
                                <TableHead className="text-right font-bold">DATE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matches?.map((match: any) => {
                                const isP1 = match.player1Id === id
                                const opponentName = isP1 ? match.player2.name : match.player1.name
                                const myScore = isP1 ? match.player1Score : match.player2Score
                                const oppScore = isP1 ? match.player2Score : match.player1Score
                                const isWin = match.winnerId === id
                                const eloChange = isP1 ? match.eloDelta1 : match.eloDelta2
                                const isPending = match.status === 'PENDING'
                                
                                return (
                                    <TableRow key={match.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            {isPending ? (
                                                <Badge variant="outline" className="border-yellow-500 text-yellow-500 animate-pulse">
                                                    PENDING
                                                </Badge>
                                            ) : (
                                                <Badge variant={isWin ? "default" : "secondary"} className={isWin ? "bg-green-600 hover:bg-green-700" : "bg-red-900/50 text-red-200"}>
                                                    {isWin ? "VICTORY" : "DEFEAT"}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-bold text-lg">
                                            <div className="flex items-center gap-2">
                                                {opponentName}
                                                <Link 
                                                    href={`/compare?player1=${id}&player2=${isP1 ? match.player2Id : match.player1Id}`}
                                                    className="ml-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                                    title="Compare Head-to-Head"
                                                >
                                                    <Swords className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xl">
                                            <span className={isWin ? "text-green-500" : "text-red-500"}>{myScore}</span>
                                            <span className="text-muted-foreground mx-2">-</span>
                                            <span className={!isWin ? "text-green-500" : "text-red-500"}>{oppScore}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-lg">
                                            {isPending ? (
                                                <span className="text-muted-foreground">-</span>
                                            ) : (
                                                eloChange > 0 ? (
                                                    <span className="text-green-500">+{eloChange}</span>
                                                ) : (
                                                    <span className="text-red-500">{eloChange}</span>
                                                )
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {new Date(match.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {(!matches || matches.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No matches recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
