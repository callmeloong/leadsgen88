'use server'

import {
    getPlayersService,
    createPlayerService,
    updateProfileService,
    logoutService,
    changePasswordService
} from '@/lib/services/player.service'

import {
    createMatchService,
    confirmMatchService,
    rejectMatchService,
    updateMatchScoreService,
    finishMatchService,
    initializeLiveMatchService,
    cancelLiveMatchService
} from '@/lib/services/match.service'

import {
    issueChallengeService,
    respondChallengeService,
    issueOpenChallengeService,
    acceptOpenChallengeService,
    cancelChallengeService
} from '@/lib/services/challenge.service'

// Player Actions
export async function getPlayers() {
    return getPlayersService()
}

export async function createPlayer(name: string, email: string) {
    return createPlayerService(name, email)
}

export async function updateProfile(playerId: string, name: string, nickname: string, telegram: string, nickname_placement: string = 'middle') {
    return updateProfileService(playerId, name, nickname, telegram, nickname_placement)
}

export async function logout() {
    return logoutService()
}

export async function changePassword(password: string) {
    return changePasswordService(password)
}

// Match Actions
export async function createMatch(player1Id: string, player2Id: string, player1Score: number, player2Score: number) {
    return createMatchService(player1Id, player2Id, player1Score, player2Score)
}

export async function confirmMatch(matchId: string) {
    return confirmMatchService(matchId)
}

export async function rejectMatch(matchId: string) {
    return rejectMatchService(matchId)
}

export async function updateMatchScore(matchId: string, player1Score: number, player2Score: number) {
    return updateMatchScoreService(matchId, player1Score, player2Score)
}

export async function finishMatch(matchId: string) {
    return finishMatchService(matchId)
}

export async function initializeLiveMatch(challengeId: string) {
    return initializeLiveMatchService(challengeId)
}

export async function cancelLiveMatch(matchId: string) {
    return cancelLiveMatchService(matchId)
}

// Challenge Actions
export async function issueChallenge(opponentId: string, message?: string, scheduledTime?: string, gameType?: string, raceTo?: number, handicap?: number) {
    return issueChallengeService(opponentId, message, scheduledTime, gameType, raceTo, handicap)
}

export async function respondChallenge(challengeId: string, accept: boolean) {
    return respondChallengeService(challengeId, accept)
}

export async function issueOpenChallenge(message?: string, scheduledTime?: string, gameType?: string, raceTo?: number, handicap?: number) {
    return issueOpenChallengeService(message, scheduledTime, gameType, raceTo, handicap)
}

export async function acceptOpenChallenge(challengeId: string) {
    return acceptOpenChallengeService(challengeId)
}

export async function cancelChallenge(challengeId: string) {
    return cancelChallengeService(challengeId)
}
