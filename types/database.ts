// =============================================================================
// FILE: types/database.ts
// PURPOSE: TypeScript types that match our Supabase database tables exactly.
//          Using these types means TypeScript will catch any mistake where
//          we try to access a column that doesn't exist in the database.
//          These are used with the Supabase client: createClient<Database>()
// =============================================================================

export type Database = {
  public: {
    Tables: {

      profiles: {
        Row: {
          id:         string
          full_name:  string | null
          username:   string | null
          phone:      string | null
          avatar_url: string | null
          role:       'user' | 'admin'
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id:         string
          full_name?: string | null
          username?:  string | null
          phone?:     string | null
          avatar_url?: string | null
          role?:      'user' | 'admin'
          is_active?: boolean
        }
        Update: {
          full_name?:  string | null
          username?:   string | null
          phone?:      string | null
          avatar_url?: string | null
          is_active?:  boolean
          updated_at?: string
        }
      }

      watchlists: {
        Row: {
          id:         string
          user_id:    string
          name:       string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          name:       string
          is_default?: boolean
        }
        Update: {
          name?:       string
          is_default?: boolean
        }
      }

      watchlist_items: {
        Row: {
          id:           string
          watchlist_id: string
          symbol:       string
          added_price:  number | null
          sort_order:   number
          added_at:     string
        }
        Insert: {
          id?:          string
          watchlist_id: string
          symbol:       string
          added_price?: number | null
          sort_order?:  number
        }
        Update: {
          sort_order?:  number
          added_price?: number | null
        }
      }

    }
  }
}
