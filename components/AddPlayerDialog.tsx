'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createPlayer } from '@/app/actions'
import { toast } from 'sonner'

export function AddPlayerDialog() {
  const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await createPlayer(name, email)
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Đã thêm người chơi")
            setOpen(false)
            setName('')
            setEmail('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="text-xl font-bold uppercase tracking-widest">
                    + ADD PLAYER
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold uppercase tracking-wide">New Player</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4">
                    <div className="space-y-2">
                        <Input 
                            className="text-2xl p-6 font-bold uppercase"
                            placeholder="PLAYER NAME..." 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Input 
                            className="text-xl p-6 font-bold"
                            placeholder="EMAIL (OPTIONAL)..." 
                            type="email"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            disabled={loading}
                        />
                    </div>
                    <Button type="submit" disabled={loading} size="lg" className="w-full text-xl font-bold uppercase tracking-widest">
                        {loading ? 'SAVING...' : 'CONFIRM'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
