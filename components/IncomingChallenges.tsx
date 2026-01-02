'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { respondChallenge } from '@/app/actions'
import { toast } from 'sonner'
import { Swords, Check, X } from 'lucide-react'

export function IncomingChallenges({ playerId }: { playerId: string }) {
    const [challenges, setChallenges] = useState<any[]>([])
    const supabase = createClient()

    const fetchChallenges = useCallback(async () => {
        const { data } = await supabase
            .from('Challenge')
            .select(`
                *,
                challenger:challengerId(name)
            `)
            .eq('opponentId', playerId)
            .eq('status', 'PENDING')
        
        if (data) setChallenges(data)
    }, [playerId, supabase])

    useEffect(() => {
        fetchChallenges()
        
        const channel = supabase.channel('incoming_challenges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Challenge' }, () => {
                fetchChallenges()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchChallenges, supabase])

    const handleRespond = async (id: string, accept: boolean) => {
        toast.promise(respondChallenge(id, accept), {
            loading: 'Đang xử lý...',
            success: () => {
                fetchChallenges()
                return accept ? 'Đã nhận kèo! Chiến thôi!' : 'Đã từ chối.'
            },
            error: (err) => err.error
        })
    }

    if (challenges.length === 0) return null

    return (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-4">
             <div className="flex items-center gap-2 text-red-500 mb-2 px-1">
                <Swords className="w-5 h-5 animate-bounce" />
                <span className="text-sm font-bold tracking-widest uppercase">Challenge Requests ({challenges.length})</span>
            </div>

            <div className="grid gap-3">
                {challenges.map(c => (
                    <div key={c.id} className="relative overflow-hidden rounded-lg border border-red-500/30 bg-background/60 p-4 flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                         {/* Flash Effect */}
                         <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />

                         <div className="z-10 flex flex-col sm:flex-row items-center gap-2">
                             <div className="font-handjet text-2xl uppercase">
                                <span className="text-primary font-bold">{c.challenger.name}</span>
                                <span className="mx-2 text-muted-foreground text-base font-sans">thách đấu bạn</span>
                             </div>
                             {c.message && (
                                <div className="text-sm italic text-muted-foreground mt-1 bg-black/20 p-2 rounded border-l-2 border-red-500">
                                    &quot;{c.message}&quot;
                                </div>
                             )}
                             <div>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 rounded-full">
                                    Head-to-Head
                                </span>
                             </div>
                         </div>

                         <div className="z-10 flex gap-2">
                             <Button 
                                size="sm" 
                                className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider uppercase border border-red-500"
                                onClick={() => handleRespond(c.id, true)}
                             >
                                <Check className="w-4 h-4 mr-1" /> ACCEPT
                             </Button>
                             <Button 
                                size="sm" 
                                variant="outline"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => handleRespond(c.id, false)}
                             >
                                <X className="w-4 h-4" />
                             </Button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
