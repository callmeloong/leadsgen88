
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity } from 'lucide-react'
import Link from 'next/link'

interface MatchActivity {
    id: string
    player1: { id: string, name: string }
    player2: { id: string, name: string }
    player1Score: number
    player2Score: number
    winnerId: string | null
    eloDelta1: number
    eloDelta2: number
    createdAt: string
}

function getFlavorText(p1Score: number, p2Score: number, eloDiff: number) {
    const scoreDiff = Math.abs(p1Score - p2Score)
    
    if (scoreDiff === 0) return "Bất phân thắng bại! Kèo căng!"
    if (scoreDiff === 1) return "Chiến thắng sát nút! Thót tim!"
    if (scoreDiff >= 5) return "Hủy diệt hoàn toàn! Out trình!"
    if (Math.abs(eloDiff) > 20) return "Địa chấn đã xảy ra! Lật kèo ngoạn mục!"
    
    const phrases = [
        "Một trận đấu kịch tính!",
        "Kẻ tám lạng, người nửa cân.",
        "Chiến thắng xứng đáng.",
        "Phong độ hủy diệt.",
        "Không thể cản phá!"
    ]
    return phrases[Math.floor(Math.random() * phrases.length)]
}

export function ActivityFeed({ matches }: { matches: MatchActivity[] }) {
    return (
        <Card className="border-border bg-card/50 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-5 h-5 animate-pulse text-green-500" />
                    Live Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <ScrollArea className="pr-4">
                    <div className="space-y-4">
                        {matches.map((match) => {
                            const isP1Win = match.winnerId === match.player1.id
                            const winner = isP1Win ? match.player1 : match.player2
                            const loser = isP1Win ? match.player2 : match.player1
                            const winnerDelta = isP1Win ? match.eloDelta1 : match.eloDelta2
                            
                            // Flavor text logic needs elo change context
                            // We don't have pre-match elo diff easily here without calculation, 
                            // but we can imply "Upset" if the winner got a LOT of points (e.g. > 20)
                            const flavor = getFlavorText(match.player1Score, match.player2Score, winnerDelta)

                            return (
                                <div key={match.id} className="border-l-2 border-primary/20 pl-4 py-1 relative font-mono">
                                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-primary/50" />
                                    <p className="text-xs text-muted-foreground font-mono mb-1">
                                        {new Date(match.createdAt).toLocaleString('vi-VN', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </p>
                                    <div className="text-sm">
                                        <Link href={`/player/${winner.id}`} className="font-bold text-primary hover:underline">
                                            {winner.name}
                                        </Link>
                                        <span className="text-muted-foreground mx-1">def.</span>
                                        <Link href={`/player/${loser.id}`} className="font-bold text-muted-foreground hover:underline">
                                            {loser.name}
                                        </Link>
                                    </div>
                                    <div className="font-mono text-sm font-bold mt-1">
                                        {match.player1Score} - {match.player2Score} 
                                        {winnerDelta > 0 && <span className="text-green-500 ml-2">(+{winnerDelta} ELO)</span>}
                                    </div>
                                    <p className="text-xs text-yellow-500/80 italic mt-1 font-mono">
                                        &quot;{flavor}&quot;
                                    </p>
                                </div>
                            )
                        })}
                        {matches.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No data found.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
