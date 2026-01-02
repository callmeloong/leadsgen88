'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/app/actions'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function EditProfileDialog({ player }: { player: any }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(player.name)
    const [nickname, setNickname] = useState(player.nickname || '')
    const [telegram, setTelegram] = useState(player.telegram || '')
    const [placement, setPlacement] = useState(player.nickname_placement || 'middle')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const res = await updateProfile(player.id, name, nickname, telegram, placement)
        
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Profile updated successfully")
            setOpen(false)
            router.refresh()
        }
    }

    const nicknamePlacement = [
        { value: 'middle', label: 'Middle', extras: '(Họ - Tên Đệm "Nick" Tên)' },
        { value: 'last', label: 'End', extras: '(Họ Tên "Nick")' },
        { value: 'first', label: 'After Surname', extras: '(Họ "Nick" Tên - Đệm Tên)' },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your display name, nickname and its position.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Your full name"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nickname">Nickname</Label>
                            <Input 
                                id="nickname" 
                                value={nickname} 
                                onChange={(e) => setNickname(e.target.value)} 
                                placeholder='e.g. "The Sniper"'
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Display Style</Label>
                             <Select value={placement} onValueChange={(value) => setPlacement(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {nicknamePlacement.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                            <span className="text-xs text-muted-foreground">{item.extras}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telegram">Telegram Username (Optional)</Label>
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground">@</span>
                            <Input 
                                id="telegram" 
                                value={telegram} 
                                onChange={(e) => setTelegram(e.target.value)} 
                                placeholder="username"
                                className="rounded-l-none"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Để bot tag bạn khi có kèo mới.</p>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
