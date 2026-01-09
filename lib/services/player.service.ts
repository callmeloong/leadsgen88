
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getPlayersService() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.from('Player').select('*')

    if (error) {
        console.error('Error fetching players:', error)
        return []
    }

    // Sort in memory: Ranked (by ELO desc) -> Unranked (by Date desc)
    return (data || []).sort((a, b) => {
        const aPlayed = a.wins + a.losses > 0
        const bPlayed = b.wins + b.losses > 0

        if (aPlayed && !bPlayed) return -1
        if (!aPlayed && bPlayed) return 1

        if (aPlayed && bPlayed) {
            if (b.elo !== a.elo) return b.elo - a.elo
            return b.wins - a.wins
        }

        return a.name.localeCompare(b.name)
    })
}

export async function createPlayerService(name: string, email: string) {
    if (!name.trim()) return { error: "Tên không được để trống" }
    if (!email || !email.trim()) return { error: "Email bắt buộc để tạo tài khoản" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const adminSupabase = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: authData, error: createAuthError } = await adminSupabase.auth.admin.createUser({
        email: email.trim(),
        password: '123456a@',
        email_confirm: true,
        user_metadata: { name: name.trim() }
    })

    if (createAuthError) {
        console.error('Auth Create Error:', createAuthError)
        return { error: `Lỗi tạo tài khoản: ${createAuthError.message}` }
    }

    if (!authData.user) return { error: "Không tạo được User ID" }

    try {
        const payload = {
            id: authData.user.id,
            name: name.trim(),
            email: email.trim()
        }

        const { error } = await supabase.from('Player').insert([payload])

        if (error) {
            await adminSupabase.auth.admin.deleteUser(authData.user.id)
            throw error
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating player:', error)
        return { error: `Lỗi khi tạo người chơi: ${error.message || error}` }
    }
}

export async function updateProfileService(playerId: string, name: string, nickname: string, telegram: string, nickname_placement: string = 'middle') {
    if (!name || name.trim().length === 0) return { error: "Tên không được để trống" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { data: player, error: fetchError } = await supabase.from('Player').select('email').eq('id', playerId).single()

    if (fetchError || !player) return { error: "Không tìm thấy người chơi" }

    if (player.email !== user.email) return { error: "Bạn không có quyền sửa đổi thông tin này" }

    const { error } = await supabase.from('Player').update({
        name: name.trim(),
        nickname: nickname ? nickname.trim() : null,
        telegram: telegram ? telegram.trim().replace('@', '') : null,
        nickname_placement: nickname_placement
    }).eq('id', playerId)

    if (error) return { error: "Lỗi cập nhật hồ sơ" }

    revalidatePath('/')
    revalidatePath(`/player/${playerId}`)
    return { success: true }
}

export async function logoutService() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }
    await supabase.auth.signOut()
    revalidatePath('/')
    redirect('/')
}

export async function changePasswordService(password: string) {
    if (!password || password.length < 6) return { error: "Mật khẩu phải từ 6 ký tự" }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Bạn chưa đăng nhập" }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        console.error("Change Password Error:", error)
        return { error: "Không thể đổi mật khẩu" }
    }

    return { success: true }
}
