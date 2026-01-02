
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Swords, Trophy, Crown } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ player1: string, player2: string }> }) {
    const { player1: p1Id, player2: p2Id } = await searchParams
    
    if (!p1Id || !p2Id) redirect('/')

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetch both players
    const { data: p1 } = await supabase.from('Player').select('*').eq('id', p1Id).single()
    const { data: p2 } = await supabase.from('Player').select('*').eq('id', p2Id).single()

    if (!p1 || !p2) return <div className="p-8 text-center">Players not found</div>

    // Fetch Head-to-Head Matches
    const { data: matches } = await supabase
        .from('Match')
        .select('*')
        .or(`and(player1Id.eq.${p1Id},player2Id.eq.${p2Id}),and(player1Id.eq.${p2Id},player2Id.eq.${p1Id})`)
        .order('createdAt', { ascending: false })

    // Calculate Stats
    const totalMatches = matches?.length || 0
    let p1Wins = 0
    let p2Wins = 0

    matches?.forEach((m: any) => {
        if (m.winnerId === p1Id) p1Wins++
        if (m.winnerId === p2Id) p2Wins++
    })

    const p1WinRate = totalMatches > 0 ? (p1Wins / totalMatches) * 100 : 0
    const p2WinRate = totalMatches > 0 ? (p2Wins / totalMatches) * 100 : 0

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
            <Link href={`/player/${p1Id}`} className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {p1.name}
            </Link>

            {/* VS Header */}
            <Card className="border-primary/20 bg-card/50 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10" />
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Player 1 */}
                        <div className="text-center space-y-4 flex-1">
                            <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center border-4 border-blue-500/50">
                                <span className="text-3xl font-black">{p1.name.substring(0,2).toUpperCase()}</span>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase text-blue-400">{p1.name}</h2>
                                <Badge variant="outline" className="text-lg mt-2 border-blue-500 text-blue-400">
                                    ELO: {p1.elo}
                                </Badge>
                            </div>
                        </div>

                        {/* VS Stats */}
                        <div className="text-center space-y-2 min-w-[200px]">
                            <Swords className="w-16 h-16 mx-auto text-yellow-500 animate-pulse" />
                            <div className="text-6xl font-black tracking-widest leading-none">
                                <span className="text-blue-500">{p1Wins}</span>
                                <span className="text-muted-foreground mx-2 text-4xl">-</span>
                                <span className="text-red-500">{p2Wins}</span>
                            </div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">
                                Head to Head
                            </p>
                        </div>

                        {/* Player 2 */}
                        <div className="text-center space-y-4 flex-1">
                            <div className="w-24 h-24 mx-auto rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500/50">
                                <span className="text-3xl font-black">{p2.name.substring(0,2).toUpperCase()}</span>
                            </div>
                             <div>
                                <h2 className="text-3xl font-black uppercase text-red-500">{p2.name}</h2>
                                <Badge variant="outline" className="text-lg mt-2 border-red-500 text-red-500">
                                    ELO: {p2.elo}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Win Rate Bar */}
                    <div className="mt-12 space-y-2">
                        <div className="flex justify-between text-sm font-bold uppercase tracking-wider">
                            <span className="text-blue-400">{Math.round(p1WinRate)}% Win Rate</span>
                            <span className="text-red-400">{Math.round(p2WinRate)}% Win Rate</span>
                        </div>
                        <div className="h-4 w-full bg-secondary rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${p1WinRate}%` }} />
                            <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${p2WinRate}%` }} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Match History List */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Match History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">WINNER</TableHead>
                                <TableHead className="text-center font-bold">SCORE</TableHead>
                                <TableHead className="text-right font-bold">DATE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matches?.map((match: any) => {
                                const isP1Win = match.winnerId === p1Id
                                return (
                                    <TableRow key={match.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-bold uppercase">
                                                {isP1Win ? (
                                                    <span className="text-blue-400 flex items-center gap-2">
                                                        <Crown className="w-4 h-4" /> {p1.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500 flex items-center gap-2">
                                                        <Crown className="w-4 h-4" /> {p2.name}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xl">
                                             <span className="text-blue-400">{match.player1Id === p1Id ? match.player1Score : match.player2Score}</span>
                                             <span className="mx-2">-</span>
                                             <span className="text-red-500">{match.player1Id === p1Id ? match.player2Score : match.player1Score}</span>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {new Date(match.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                             {(!matches || matches.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No matches played between these two yet.
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
