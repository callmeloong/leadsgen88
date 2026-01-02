import React from 'react'

interface PlayerNameDisplayProps {
    name: string
    nickname: string | null
    placement?: string
}

export function PlayerNameDisplay({ name, nickname, placement = 'middle' }: PlayerNameDisplayProps) {
    if (!nickname) return <span>{name}</span>

    const parts = name.trim().split(' ')
    
    const nicknameSpan = (
        <span className="text-inherit text-yellow-500 font-handjet font-normal whitespace-pre mx-1">
            &quot;{nickname}&quot;
        </span>
    )

    // Single word name -> always append at end
    if (parts.length === 1) {
         return (
            <span className="inline-flex items-center flex-wrap">
                {name} {nicknameSpan}
            </span>
         )
    }
    
    // Multi-word name
    if (placement === 'last') {
         return (
            <span className="inline-flex items-center flex-wrap">
                {name} {nicknameSpan}
            </span>
         )
    } else if (placement === 'first') {
        // After surname (first word)
        const firstName = parts.shift()
        const rest = parts.join(' ')
        return (
            <span className="inline-flex items-center flex-wrap">
                {firstName} {nicknameSpan} {rest}
            </span>
        )
    } else {
         // Middle (Default) -> insert before last word
        const lastName = parts.pop()
        const otherNames = parts.join(' ')
        return (
            <span className="inline-flex items-center flex-wrap">
                {otherNames} {nicknameSpan} {lastName}
            </span>
        )
    }
}
