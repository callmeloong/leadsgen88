
import { getPlayers } from './actions'
import { AddPlayerDialog } from '@/components/AddPlayerDialog'
import { RecordMatchDialog } from '@/components/RecordMatchDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Crown, Zap, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { UserNav } from '@/components/UserNav'
import { ActivityFeed } from '@/components/ActivityFeed'
import { PendingMatches } from '@/components/PendingMatches'
import { RealtimeManager } from '@/components/RealtimeManager'
import { IncomingChallenges } from '@/components/IncomingChallenges'
import { PlayerNameDisplay } from '@/components/PlayerNameDisplay'
import { ChallengeButton } from '@/components/ChallengeButton'
import { Swords } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const players = await getPlayers()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  // Fetch User & Profile
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'player'
  
  if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) userRole = profile.role
  }

  // Fetch recent matches for Activity Feed
  const { data: recentMatches } = await supabase
        .from('Match')
        .select(`
            *,
            player1:player1Id(name, id),
            player2:player2Id(name, id)
        `)
        .eq('status', 'APPROVED')
        .order('createdAt', { ascending: false })
        .limit(5)

  // Fetch Current Player Profile if logged in
  let currentPlayer = null
  if (user && user.email) {
      const { data } = await supabase.from('Player').select('*').eq('email', user.email).single()
      currentPlayer = data
  }

  // Fetch Upcoming Matches (Accepted Challenges)
  const now = new Date().toISOString()
  const { data: upcomingMatches } = await supabase
        .from('Challenge') // Revert to Challenge
        .select(`
            *,
            challenger:challengerId(name),
            opponent:opponentId(name)
        `)
        .eq('status', 'ACCEPTED')
        .gt('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(3)

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-7xl">
        <RealtimeManager />
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-6">
            {/* Header Content */}
            <div className="space-y-1 text-center md:text-left">
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-wider text-foreground leading-[0.8]">
                  Pool<span className="text-primary">Rank</span>
                </h1>
                <p className="text-muted-foreground text-xl tracking-widest flex items-center gap-2">
                   <Zap className="w-5 h-5 text-yellow-500" />
                   SYSTEM::ONLINE
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        {userRole === 'admin' && <AddPlayerDialog />}
                        <RecordMatchDialog players={players} userRole={userRole} currentUserId={currentPlayer?.id || user.id} />
                        <UserNav email={user.email!} role={userRole} />
                    </>
                ) : (
                    <a href="/login" className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 font-bold uppercase tracking-wider">
                        Login
                    </a>
                )}
            </div>
        </header>
        
        {/* Pass both Player ID (for query) and Auth ID (for submitter check) */}
        {currentPlayer && user && (
            <>
                <IncomingChallenges playerId={currentPlayer.id} />
                <PendingMatches playerId={currentPlayer.id} currentAuthId={user.id} />
            </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Leaderboard Section - Takes up 2 columns */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-wider text-primary">
                    <Trophy className="w-8 h-8" />
                    Leaderboard
                </div>
                
                <Card className="border-border bg-card/50">
                    <CardHeader className="pb-2">
                        <CardTitle>STANDINGS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/20">
                                    <TableHead className="w-[80px] font-black text-primary">RANK</TableHead>
                                    <TableHead className="font-black text-primary">PLAYER</TableHead>
                                    <TableHead className="text-right font-black text-primary">ELO</TableHead>
                                    <TableHead className="text-right font-black text-primary">WINS</TableHead>
                                    <TableHead className="text-right font-black text-primary">LOSSES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {players.map((player: any, index: number) => (
                                    <TableRow key={player.id} className="text-2xl hover:bg-muted/50 transition-colors border-primary/10 group relative">
                                        <TableCell className="font-bold text-muted-foreground">
                                            #{index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    {index === 0 && <Crown className="w-6 h-6 text-yellow-500" />}
                                                    <Link href={`/player/${player.id}`} className="font-bold tracking-wide uppercase hover:underline hover:text-primary transition-colors">
                                                        <PlayerNameDisplay name={player.name} nickname={player.nickname} placement={player.nickname_placement} />
                                                    </Link>
                                                </div>

                                                {currentPlayer && currentPlayer.id !== player.id && (
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Link 
                                                            href={`/compare?player1=${currentPlayer.id}&player2=${player.id}`}
                                                            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                                                            title="So sánh Head-to-Head"
                                                        >
                                                            <Activity className="w-5 h-5" />
                                                        </Link>
                                                        
                                                        <ChallengeButton 
                                                            player={player} 
                                                            customTrigger={
                                                                <button 
                                                                    className="p-2 rounded-full hover:bg-red-600/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                                    title="Thách đấu ngay"
                                                                >
                                                                    <Swords className="w-5 h-5" />
                                                                </button>
                                                            } 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-3xl text-primary">
                                            {player.elo}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-500">{player.wins}</TableCell>
                                        <TableCell className="text-right font-bold text-red-500">{player.losses}</TableCell>
                                    </TableRow>
                                ))}
                                {players.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No data available. Add players to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Feed Section - Takes up 1 column */}
            <div className="lg:col-span-1 space-y-6">
                 <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-wider text-muted-foreground">
                    <Activity className="w-8 h-8" />
                    Activity
                </div>
                <ActivityFeed matches={recentMatches || []} upcoming={upcomingMatches || []} />
            </div>
        </div>
    </div>
  )
}
