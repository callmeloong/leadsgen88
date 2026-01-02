'use client'

import { useState } from 'react'
import { Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { issueChallenge } from '@/app/actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'

export function ChallengeButton({ player }: { player: any }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleChallenge = async () => {
        setLoading(true)
        const res = await issueChallenge(player.id)
        setLoading(false)
        setOpen(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Đã gửi lời thách đấu! Chờ đối thủ nhận kèo.")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Badge className="text-lg px-6 py-2 bg-red-600 hover:bg-red-700 cursor-pointer animate-pulse border-none text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    <Swords className="w-5 h-5 mr-2" />
                    THÁCH ĐẤU
                </Badge>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gửi lời tuyên chiến?</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn thách đấu **{player.name}** không?
                        <br />
                        Một thông báo sẽ được gửi tới Telegram của nhóm.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button onClick={handleChallenge} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                        {loading ? 'Đang gửi...' : 'Gửi Lời Thách Đấu ⚔️'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
