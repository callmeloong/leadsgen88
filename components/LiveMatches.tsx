'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export function LiveMatches() {
    const [matches, setMatches] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchLiveMatches = async () => {
            const { data } = await supabase
                .from('Match')
                .select(`
                    *,
                    player1:player1Id(name),
                    player2:player2Id(name)
                `)
                .eq('status', 'LIVE')
            
            if (data) setMatches(data)
        }

        fetchLiveMatches()

        const channel = supabase
            .channel('live-matches')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Match',
                    filter: 'status=eq.LIVE'
                },
                () => {
                    fetchLiveMatches()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    if (matches.length === 0) return null

    return (
        <div className="mb-8 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                ĐANG DIỄN RA
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => (
                    <Link key={match.id} href={`/live/${match.id}`}>
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl hover:border-red-500/50 transition-all cursor-pointer group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex justify-between items-center relative z-10">
                                <div className="text-center flex-1">
                                    <div className="font-bold text-lg text-blue-400 truncate">{match.player1.name}</div>
                                </div>
                                
                                <div className="px-4 flex flex-col items-center">
                                    <div className="text-2xl font-handjet font-bold tracking-widest bg-black/50 px-3 py-1 rounded border border-zinc-700">
                                        {match.player1Score} - {match.player2Score}
                                    </div>
                                    <Badge variant="outline" className="mt-2 text-[10px] border-red-500/50 text-red-500 animate-pulse">
                                        LIVE
                                    </Badge>
                                </div>

                                <div className="text-center flex-1">
                                    <div className="font-bold text-lg text-red-400 truncate">{match.player2.name}</div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
