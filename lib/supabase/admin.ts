import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const createAdminClient = () => {
    if (!supabaseServiceRole) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Check your Vercel Environment Variables.')
    }
    return createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
