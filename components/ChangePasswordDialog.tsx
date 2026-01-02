'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { changePassword } from '@/app/actions'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await changePassword(password)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Đổi mật khẩu thành công")
      setOpen(false)
      setPassword('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
            <Lock className="mr-2 h-4 w-4" />
            <span>Đổi mật khẩu</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-wide">Đổi mật khẩu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
              <Input 
                type="password"
                className="text-lg p-4 font-bold"
                placeholder="Mật khẩu mới..." 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={loading}
              />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="w-full text-lg font-bold uppercase">
            {loading ? 'Đang lưu...' : 'Lưu mật khẩu'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
