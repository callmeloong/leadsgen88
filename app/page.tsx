import { getPlayers } from './actions'
import { AddPlayerDialog } from '@/components/AddPlayerDialog'
import { RecordMatchDialog } from '@/components/RecordMatchDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Swords, Crown, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const players = await getPlayers()

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-6">
            <div className="space-y-1 text-center md:text-left">
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-wider text-foreground leading-[0.8]">
                  Pool<span className="text-primary">Rank</span>
                </h1>
                <p className="text-muted-foreground text-xl tracking-widest flex items-center gap-2">
                   <Zap className="w-5 h-5 text-yellow-500" />
                   SYSTEM::ONLINE
                </p>
            </div>
            
            <div className="flex gap-4">
                <AddPlayerDialog />
                <RecordMatchDialog players={players} />
            </div>
        </header>

        <section className="grid grid-cols-1 gap-8">
            <Card className="border border-border bg-card/50 shadow-lg">
                <CardHeader className="border-b border-border p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        <CardTitle className="text-4xl font-bold uppercase tracking-wide">
                            Leaderboard
                        </CardTitle>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground animate-pulse">
                        LIVE_DATA
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px] text-center font-bold text-2xl">RANK</TableHead>
                                <TableHead className="font-bold text-2xl">PLAYER</TableHead>
                                <TableHead className="text-right font-bold text-2xl text-primary">ELO</TableHead>
                                <TableHead className="text-right font-bold text-2xl text-green-500 hidden sm:table-cell">W</TableHead>
                                <TableHead className="text-right font-bold text-2xl text-red-500 hidden sm:table-cell">L</TableHead>
                                <TableHead className="text-right font-bold text-2xl">TOTAL</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player, index) => (
                                <TableRow key={player.id} className="hover:bg-accent/50 transition-colors text-xl">
                                    <TableCell className="text-center font-bold text-3xl">
                                        {index === 0 ? <span className="text-yellow-500">#1</span> : 
                                         index === 1 ? <span className="text-slate-400">#2</span> : 
                                         index === 2 ? <span className="text-orange-600">#3</span> : 
                                         <span className="text-muted-foreground">{index + 1}</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            {index === 0 && <Crown className="w-6 h-6 text-yellow-500" />}
                                            <span className="font-bold tracking-wide uppercase">{player.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-3xl text-primary">
                                        {player.elo}
                                    </TableCell>
                                    <TableCell className="text-right text-green-500 hidden sm:table-cell">{player.wins}</TableCell>
                                    <TableCell className="text-right text-red-500 hidden sm:table-cell">{player.losses}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{player.wins + player.losses}</TableCell>
                                </TableRow>
                            ))}
                            {players.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-24 text-muted-foreground border-none">
                                        <div className="flex flex-col items-center gap-4 opacity-50">
                                            <Swords className="w-16 h-16" />
                                            <p className="text-3xl font-bold uppercase">No Players Configured</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    </div>
  )
}
