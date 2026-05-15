import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: ReturnType<typeof createClient> | null = null

export const supabase = {
  get auth() {
    if (!client) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables for client auth')
      }

      client = createClient(supabaseUrl, supabaseAnonKey)
    }

    return client.auth
  },
}
