'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeManager() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Debounce refresh to avoid multiple refreshes for rapid updates
        let isRefreshing = false
        const refreshData = () => {
            if (isRefreshing) return
            isRefreshing = true
            router.refresh()
            setTimeout(() => {
                isRefreshing = false
            }, 1000)
        }

        const channel = supabase.channel('realtime_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Match',
                },
                (payload) => {
                    console.log('Match change received!', payload)
                    refreshData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Only care about ELO/Win/Loss updates
                    schema: 'public',
                    table: 'Player',
                },
                (payload) => {
                    console.log('Player change received!', payload)
                    refreshData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router, supabase])

    return null // This component doesn't render anything visually
}
