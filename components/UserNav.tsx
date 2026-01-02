'use client'

import { logout } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Shield } from 'lucide-react'
import { ChangePasswordDialog } from './ChangePasswordDialog'

export function UserNav({ email, role }: { email: string; role: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative h-10 w-10 rounded-full border-primary/50">
           <User className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none uppercase tracking-wider">
                {role === 'admin' && <Shield className="w-3 h-3 inline mr-1 text-yellow-500" />}
                {role}
            </p>
            <p className="text-xs leading-none text-muted-foreground font-mono">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
             <ChangePasswordDialog />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()} className="text-red-500 cursor-pointer font-bold uppercase">
          <LogOut className="mr-2 h-4 w-4" />
          <span>LOGOUT</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
