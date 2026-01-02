'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Zap, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

const initialState = {
  error: '',
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-border bg-card/50 shadow-lg">
            <CardHeader className="text-center space-y-2">
                 <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Zap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-black uppercase tracking-widest text-primary">
                    SYSTEM ACCESS
                </CardTitle>
                <p className="text-muted-foreground font-mono text-sm">
                    PLEASE IDENTIFY YOURSELF
                </p>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                        <Input 
                            name="email" 
                            type="email" 
                            placeholder="admin@leadsgen.com" 
                            required
                            className="bg-background/50 font-mono text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                        <Input 
                            name="password" 
                            type="password" 
                            required
                            className="bg-background/50 font-mono text-lg"
                        />
                    </div>
                    
                    <Button 
                        disabled={isPending}
                        className="w-full font-black text-xl uppercase tracking-widest h-12"
                    >
                        {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Login >>'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  )
}
