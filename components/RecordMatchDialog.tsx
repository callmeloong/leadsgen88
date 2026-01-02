'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMatch } from '@/app/actions'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
}

export function RecordMatchDialog({ players, userRole, currentUserId }: { players: Player[]; userRole: string; currentUserId?: string }) {
  const searchParams = useSearchParams()
  const challengeOpponent = searchParams.get('challenge')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [player1, setPlayer1] = useState<string>('')
  const [player2, setPlayer2] = useState<string>('')
  const [score1, setScore1] = useState<string>('')
  const [score2, setScore2] = useState<string>('')

  // Auto-set Player 1 logic
  useEffect(() => {
    // If entering via Challenge mode
    if (challengeOpponent) {
      setOpen(true)
      setPlayer2(challengeOpponent)
      if (currentUserId) setPlayer1(currentUserId)
    } 
    // If normal mode and not admin, force Player 1 to be current user
    else if (userRole !== 'admin' && currentUserId) {
      setPlayer1(currentUserId)
    }
  }, [challengeOpponent, currentUserId, userRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (player1 === player2) {
      toast.error("Hai người chơi phải khác nhau")
      return
    }
    if (!score1 || !score2) {
        toast.error("Vui lòng nhập tỷ số")
        return
    }
    
    setLoading(true)
    const res = await createMatch(player1, player2, parseInt(score1), parseInt(score2))
    setLoading(false)
    
    if (res.error) {
        toast.error(res.error)
    } else {
        if (res.pending) {
            toast.info("Đã gửi kết quả! Chờ đối thủ xác nhận.")
        } else {
            toast.success("Đã ghi nhận trận đấu")
        }
        setOpen(false)
        setPlayer1('')
        setPlayer2('')
        setScore1('')
        setScore2('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="text-xl font-bold uppercase tracking-widest">
            {userRole === 'admin' ? 'RECORD MATCH' : 'SUBMIT RESULT'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold uppercase tracking-wide">Match Result</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xl font-bold uppercase text-muted-foreground">Player 1</Label>
                    <Select value={player1} onValueChange={setPlayer1} disabled={userRole !== 'admin'}>
                        <SelectTrigger className="text-xl font-bold">
                            <SelectValue placeholder="SELECT..." />
                        </SelectTrigger>
                        <SelectContent>
                            {players.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xl font-bold uppercase">{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-xl font-bold uppercase text-muted-foreground">Score</Label>
                    <Input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        className="text-2xl font-bold text-center"
                        value={score1}
                        onChange={(e) => setScore1(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xl font-bold uppercase text-muted-foreground">Player 2</Label>
                    <Select value={player2} onValueChange={setPlayer2}>
                        <SelectTrigger className="text-xl font-bold">
                            <SelectValue placeholder="SELECT..." />
                        </SelectTrigger>
                        <SelectContent>
                            {players.map(p => (
                                <SelectItem key={p.id} value={p.id} disabled={p.id === player1} className="text-xl font-bold uppercase">{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-xl font-bold uppercase text-muted-foreground">Score</Label>
                    <Input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        className="text-2xl font-bold text-center"
                        value={score2}
                        onChange={(e) => setScore2(e.target.value)}
                    />
                </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="mt-4 w-full text-xl font-bold uppercase tracking-widest">
                {loading ? 'SAVING...' : 'CONFIRM SCORE'}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
