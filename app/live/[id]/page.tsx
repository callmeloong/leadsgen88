'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateMatchScore, finishMatch } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Trophy, ArrowLeft, Minus, Plus, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)
    
    const [user, setUser] = useState<any>(null)
    const [match, setMatch] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

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

        init()

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
                        toast.success("Trận đấu đã kết thúc!", { duration: 5000 })
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
        if (match.status !== 'LIVE') return

        const newP1 = Math.max(0, match.player1Score + p1Delta)
        const newP2 = Math.max(0, match.player2Score + p2Delta)
        
        // Optimistic update
        setMatch((prev: any) => ({ ...prev, player1Score: newP1, player2Score: newP2 }))
        
        // Server update
        const res = await updateMatchScore(match.id, newP1, newP2)
        if (res.error) {
            toast.error(res.error)
        }
    }

    const handleFinish = async () => {
        if (match.status === 'LIVE') {
            if (!confirm("Xác nhận kết thúc để gửi báo cáo cho đối thủ?")) return
        } else if (match.status === 'WAITING_CONFIRMATION') {
            if (!confirm("Xác nhận kết quả trận đấu là chính xác?")) return
        }

        setUpdating(true)
        const res = await finishMatch(match.id)
        if (res.error) {
            toast.error(res.error)
            setUpdating(false)
        } else {
            if (res.message) toast.message(res.message) // "Waiting for confirmation"
            else toast.success("Thành công!") // "Finished"
            
            // If it was just a request, we stay on page and wait for update
            // If confirmed, the real-time listener will redirect
            if (match.status === 'WAITING_CONFIRMATION') {
                 // Nothing, wait for redirect
            } else {
                // If it was LIVE -> WAITING, update state locally to reflect UI immediately
                 setMatch((prev: any) => ({ ...prev, status: 'WAITING_CONFIRMATION', submitterId: user.id }))
                 setUpdating(false)
            }
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-white" /></div>

    if (!match) return <div className="p-8 text-center text-white">Match not found</div>

    const isParticipant = user && (
        user.id === match.player1Id || 
        user.id === match.player2Id ||
        (match.player1 && user.email === match.player1.email) ||
        (match.player2 && user.email === match.player2.email)
    )

    const isWaiting = match.status === 'WAITING_CONFIRMATION'
    const isSubmitter = match.submitterId === user?.id

    return (
        <div className="h-screen w-full bg-zinc-950 text-white flex flex-col overflow-hidden fixed inset-0">
            {/* Header - Compact */}
            <div className="shrink-0 h-14 px-4 flex items-center justify-between bg-zinc-900/50 border-b border-zinc-800 z-50 relative">
                <Link href="/" className="text-zinc-400 hover:text-white p-2 -ml-2">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2 font-handjet text-xl tracking-wider text-red-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {isWaiting ? <span className="text-yellow-500">CONFIRMING...</span> : 'LIVE'}
                </div>
                
                {isParticipant ? (
                    <div className="flex gap-2">
                         {/* Cancel Button (Trash) */}
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                            title="Huỷ trận đấu"
                            disabled={updating}
                            onClick={async () => {
                                if (confirm("Bạn có chắc muốn huỷ trận đấu này? Dữ liệu sẽ bị xoá vĩnh viễn.")) {
                                    setUpdating(true)
                                    // Use imported rejectMatch
                                    const { rejectMatch } = await import('@/app/actions')
                                    const res = await rejectMatch(match.id)
                                    if (res.error) {
                                        toast.error(res.error)
                                        setUpdating(false)
                                    } else {
                                        toast.success("Đã huỷ trận đấu")
                                        router.push('/')
                                    }
                                }
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>

                        {isWaiting ? (
                             isSubmitter ? (
                                <Button disabled size="sm" className="h-8 text-xs bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">
                                    Waiting...
                                </Button>
                             ) : (
                                <Button 
                                    size="sm"
                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white animate-pulse font-bold"
                                    onClick={handleFinish}
                                    disabled={updating}
                                >
                                    {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'CONFIRM'}
                                </Button>
                             )
                        ) : (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-xs bg-red-600/20 text-red-500 border border-red-900 hover:bg-red-600 hover:text-white transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)] hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                onClick={handleFinish}
                                disabled={updating}
                            >
                                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'FINISH'}
                            </Button>
                        )}
                    </div>
                ) : (
                     <div className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono uppercase tracking-widest border border-zinc-700">
                        SPECTATOR
                    </div>
                )}
            </div>

            {/* Split Screen Content - Responsive Flex */}
            {/* ENABLE SCROLL: Changed h-screen/overflow-hidden to min-h-screen/overflow-y-auto */}
            <div className="flex-1 flex flex-col landscape:flex-row md:flex-row relative min-h-0 overflow-y-auto">
                {/* Player 1 Section */}
                <div className="flex-1 bg-blue-950/20 border-b landscape:border-b-0 landscape:border-r md:border-b-0 md:border-r border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                    
                    {/* Name */}
                    <h2 className="text-2xl landscape:text-3xl md:text-5xl font-black text-blue-400 text-center uppercase tracking-tight z-10 mt-4 md:mt-0 truncate max-w-full px-4">
                        {match.player1.name}
                    </h2>
                    
                    {/* Score - Scaled by Viewport */}
                    <div className="flex-1 flex items-center justify-center z-10 w-full">
                         <div className="text-[35vh] landscape:text-[40vh] md:text-[180px] font-handjet leading-none text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] select-none">
                            {match.player1Score}
                        </div>
                    </div>

                    {/* Controls - Compact & Bottom/Center */}
                    {isParticipant && !isWaiting && (
                        <div className="flex gap-8 mb-6 landscape:mb-8 md:mb-12 z-20">
                            <button 
                                onClick={() => handleUpdateScore(-1, 0)}
                                className="w-14 h-14 landscape:w-16 landscape:h-16 md:w-20 md:h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all active:scale-95 touch-manipulation"
                            >
                                <Minus className="w-6 h-6 md:w-8 md:h-8" />
                            </button>
                            <button 
                                onClick={() => handleUpdateScore(1, 0)}
                                className="w-14 h-14 landscape:w-16 landscape:h-16 md:w-20 md:h-20 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 hover:scale-105 transition-all active:scale-95 touch-manipulation"
                            >
                                <Plus className="w-8 h-8 md:w-10 md:h-10" />
                            </button>
                        </div>
                    )}
                </div>

                {/* VS Divider - Center Absolute */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-full bg-zinc-950 border border-zinc-800 shadow-xl pointer-events-none">
                    <span className="font-bold text-zinc-500 text-xs md:text-base">VS</span>
                </div>

                {/* Player 2 Section */}
                <div className="flex-1 bg-red-950/20 flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-10 transition-opacity" />

                    {/* Name */}
                    <h2 className="text-2xl landscape:text-3xl md:text-5xl font-black text-red-400 text-center uppercase tracking-tight z-10 mt-4 md:mt-0 truncate max-w-full px-4">
                        {match.player2.name}
                    </h2>

                    {/* Score */}
                    <div className="flex-1 flex items-center justify-center z-10 w-full">
                        <div className="text-[35vh] landscape:text-[40vh] md:text-[180px] font-handjet leading-none text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] select-none">
                            {match.player2Score}
                        </div>
                    </div>

                    {/* Controls */}
                    {isParticipant && !isWaiting && (
                        <div className="flex gap-8 mb-6 landscape:mb-8 md:mb-12 z-20">
                             <button 
                                onClick={() => handleUpdateScore(0, -1)}
                                className="w-14 h-14 landscape:w-16 landscape:h-16 md:w-20 md:h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all active:scale-95 touch-manipulation"
                            >
                                <Minus className="w-6 h-6 md:w-8 md:h-8" />
                            </button>
                            <button 
                                onClick={() => handleUpdateScore(0, 1)}
                                className="w-14 h-14 landscape:w-16 landscape:h-16 md:w-20 md:h-20 rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:bg-red-500 hover:scale-105 transition-all active:scale-95 touch-manipulation"
                            >
                                <Plus className="w-8 h-8 md:w-10 md:h-10" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
