'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { confirmMatch, rejectMatch } from '@/app/actions'
import { toast } from 'sonner'
import { Check, X, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function PendingMatches({ playerId, currentAuthId }: { playerId: string, currentAuthId: string }) {
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchPendingMatches = async () => {
        // Fetch matches where status is PENDING and user is involved (player1 or player2)
        // AND user is NOT the submitter.
        const { data, error } = await supabase
            .from('Match')
            .select(`
                *,
                player1:player1Id(name),
                player2:player2Id(name)
            `)
            .in('status', ['PENDING', 'WAITING_CONFIRMATION'])
            .or(`player1Id.eq.${playerId},player2Id.eq.${playerId}`)
        
        if (error) {
            console.error(error)
        } else {
            // Filter out matches submitted by self
            const incomingAndSelf = data || []
            setMatches(incomingAndSelf)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPendingMatches()
        
        // Subscribe to changes? For now just fetch on mount.
        const channel = supabase.channel('pending_matches')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Match' }, () => {
            fetchPendingMatches()
        })
        .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [playerId])

    const handleConfirm = async (matchId: string) => {
        toast.loading("Processing...")
        const res = await confirmMatch(matchId)
        toast.dismiss()
        if (res.error) toast.error(res.error)
        else {
            toast.success("Confirmed match!")
            fetchPendingMatches()
        }
    }

    const handleReject = async (matchId: string) => {
         if(!confirm("Are you sure you want to reject this match?")) return
         const res = await rejectMatch(matchId)
         if (res.error) toast.error(res.error)
         else {
             toast.success("Rejected match")
             fetchPendingMatches()
         }
    }

    if (loading) return null
    if (matches.length === 0) return null

    return (
        <div className="mb-8 space-y-2 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-2 px-1">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-bold tracking-widest uppercase">Pending Confirmations ({matches.length})</span>
            </div>
            
            {matches.map(match => {
                const isSubmitter = match.submitterId === currentAuthId
                return (
                    <div key={match.id} className="group relative overflow-hidden rounded-md border border-yellow-500/20 bg-background/40 hover:bg-yellow-500/5 transition-all p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex items-center gap-4 z-10">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                <div className="text-lg md:text-xl font-bold uppercase tracking-wider flex items-center gap-3">
                                    <span className={match.winnerId === match.player1Id ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-foreground"}>
                                        {match.player1.name}
                                    </span>
                                    <span className="text-muted-foreground text-sm font-sans mx-1">VS</span>
                                    <span className={match.winnerId === match.player2Id ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-foreground"}>
                                        {match.player2.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Badge variant="secondary" className="font-mono text-base border-primary/20 bg-primary/10 text-primary">
                                        {match.player1Score} - {match.player2Score}
                                     </Badge>
                                     {isSubmitter && (
                                        <span className="text-[10px] text-yellow-500/70 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            Waiting Check
                                        </span>
                                     )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 z-10 shrink-0">
                            {!isSubmitter ? (
                                <>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleConfirm(match.id)} 
                                        className="h-8 bg-green-600/90 hover:bg-green-600 text-white font-bold uppercase tracking-wider text-xs shadow-[0_0_10px_rgba(22,163,74,0.3)] hover:shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all"
                                    >
                                        <Check className="w-3 h-3 mr-1.5" /> Accept
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleReject(match.id)} 
                                        className="h-8 border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 font-bold uppercase tracking-wider text-xs"
                                    >
                                        <X className="w-3 h-3 mr-1.5" /> Deny
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleReject(match.id)} 
                                    className="h-8 text-muted-foreground hover:text-red-400 text-xs uppercase tracking-wider"
                                >
                                    Cancel Request
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
