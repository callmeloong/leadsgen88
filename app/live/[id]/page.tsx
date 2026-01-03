'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateMatchScore, finishMatch } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Trophy, ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)
    
    const [match, setMatch] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchMatch = async () => {
             const { data, error } = await supabase
                .from('Match')
                .select(`
                    *,
                    player1:player1Id(*),
                    player2:player2Id(*)
                `)
                .eq('id', id)
                .single()

            if (error) {
                toast.error("Error loading match")
            } else {
                setMatch(data)
            }
            setLoading(false)
        }

        fetchMatch()

        // Real-time Subscription
        const channel = supabase
            .channel(`match-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'Match',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    console.log('Match updated:', payload)
                    setMatch((prev: any) => ({ ...prev, ...payload.new }))
                    if (payload.new.status === 'APPROVED') {
                        toast.success("Trận đấu đã kết thúc!")
                        router.push('/')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id, router, supabase])

    const handleUpdateScore = async (p1Delta: number, p2Delta: number) => {
        if (!match) return
        const newP1 = Math.max(0, match.player1Score + p1Delta)
        const newP2 = Math.max(0, match.player2Score + p2Delta)
        
        // Optimistic update
        setMatch((prev: any) => ({ ...prev, player1Score: newP1, player2Score: newP2 }))
        
        // Server update
        const res = await updateMatchScore(match.id, newP1, newP2)
        if (res.error) {
            toast.error(res.error)
            // Revert on error? Or just let real-time fix it.
        }
    }

    const handleFinish = async () => {
        if (!confirm("Xác nhận kết thúc trận đấu? Kết quả sẽ được tính ELO ngay lập tức.")) return
        setUpdating(true)
        const res = await finishMatch(match.id)
        if (res.error) {
            toast.error(res.error)
            setUpdating(false)
        } else {
            toast.success("Trận đấu đã lưu!")
            router.push('/')
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-white" /></div>

    if (!match) return <div className="p-8 text-center text-white">Match not found</div>

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between bg-zinc-900/50 border-b border-zinc-800">
                <Link href="/" className="text-zinc-400 hover:text-white">
                    <ArrowLeft />
                </Link>
                <div className="flex items-center gap-2 font-handjet text-xl tracking-wider text-red-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    LIVE
                </div>
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleFinish}
                    disabled={updating}
                >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'KẾT THÚC'}
                </Button>
            </div>

            {/* Split Screen Content */}
            <div className="flex-1 flex flex-col md:flex-row">
                {/* Player 1 Section */}
                <div className="flex-1 bg-blue-950/20 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col items-center justify-center p-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                    
                    <h2 className="text-3xl md:text-5xl font-black mb-8 text-blue-400 text-center uppercase tracking-tight">
                        {match.player1.name}
                    </h2>
                    
                    <div className="text-[120px] md:text-[180px] font-handjet leading-none text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        {match.player1Score}
                    </div>

                    <div className="flex gap-8 mt-12 z-10">
                        <button 
                            onClick={() => handleUpdateScore(-1, 0)}
                            className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all active:scale-95"
                        >
                            <Minus className="w-8 h-8" />
                        </button>
                        <button 
                            onClick={() => handleUpdateScore(1, 0)}
                            className="w-20 h-20 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 hover:scale-105 transition-all active:scale-95"
                        >
                            <Plus className="w-10 h-10" />
                        </button>
                    </div>
                </div>

                {/* VS Divider (Absolute Center) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 shadow-xl">
                    <span className="font-bold text-zinc-500">VS</span>
                </div>

                {/* Player 2 Section */}
                <div className="flex-1 bg-red-950/20 flex flex-col items-center justify-center p-8 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-10 transition-opacity" />

                    <h2 className="text-3xl md:text-5xl font-black mb-8 text-red-400 text-center uppercase tracking-tight">
                        {match.player2.name}
                    </h2>

                    <div className="text-[120px] md:text-[180px] font-handjet leading-none text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                        {match.player2Score}
                    </div>

                    <div className="flex gap-8 mt-12 z-10">
                         <button 
                            onClick={() => handleUpdateScore(0, -1)}
                            className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all active:scale-95"
                        >
                            <Minus className="w-8 h-8" />
                        </button>
                        <button 
                            onClick={() => handleUpdateScore(0, 1)}
                            className="w-20 h-20 rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:bg-red-500 hover:scale-105 transition-all active:scale-95"
                        >
                            <Plus className="w-10 h-10" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
