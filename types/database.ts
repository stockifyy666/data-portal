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

      user_preferences: {
        Row: {
          user_id:               string
          theme:                 'light' | 'dark'
          default_chart_type:    string
          default_timeframe:     string
          notification_settings: Record<string, boolean>
          dashboard_layout:      Record<string, unknown>
          updated_at:            string
        }
        Insert: {
          user_id:               string
          theme?:                'light' | 'dark'
          default_chart_type?:   string
          default_timeframe?:    string
          notification_settings?: Record<string, boolean>
          dashboard_layout?:     Record<string, unknown>
        }
        Update: {
          theme?:                'light' | 'dark'
          default_chart_type?:   string
          default_timeframe?:    string
          notification_settings?: Record<string, boolean>
          dashboard_layout?:     Record<string, unknown>
          updated_at?:           string
        }
      }

      brokers: {
        Row: {
          id:                string
          name:              string
          code:              string
          client_identifier: string
          logo_url:          string | null
          is_active:         boolean
          created_at:        string
        }
        Insert: {
          id?:               string
          name:              string
          code:              string
          client_identifier: string
          logo_url?:         string | null
          is_active?:        boolean
        }
        Update: {
          name?:             string
          logo_url?:         string | null
          is_active?:        boolean
        }
      }

      user_broker_links: {
        Row: {
          id:               string
          user_id:          string
          broker_id:        string
          broker_user_code: string   // encrypted — never send to browser
          is_demo:          boolean
          is_active:        boolean
          linked_at:        string
        }
        Insert: {
          id?:              string
          user_id:          string
          broker_id:        string
          broker_user_code: string
          is_demo?:         boolean
          is_active?:       boolean
        }
        Update: {
          is_active?: boolean
        }
      }

      plans: {
        Row: {
          id:             string
          name:           string
          price_monthly:  number
          price_yearly:   number
          features:       Record<string, number>
          api_rate_limit: number
          is_active:      boolean
        }
        Insert: Partial<Database['public']['Tables']['plans']['Row']>
        Update: Partial<Database['public']['Tables']['plans']['Row']>
      }

      user_subscriptions: {
        Row: {
          id:         string
          user_id:    string
          plan_id:    string
          status:     'active' | 'cancelled' | 'expired'
          started_at: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          plan_id:    string
          status?:    'active' | 'cancelled' | 'expired'
          expires_at?: string | null
        }
        Update: {
          status?:    'active' | 'cancelled' | 'expired'
          expires_at?: string | null
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
          sort_order:   number
          added_at:     string
        }
        Insert: {
          id?:          string
          watchlist_id: string
          symbol:       string
          sort_order?:  number
        }
        Update: {
          sort_order?: number
        }
      }

      portfolios: {
        Row: {
          id:             string
          user_id:        string
          broker_link_id: string | null
          name:           string
          currency:       string
          created_at:     string
        }
        Insert: {
          id?:             string
          user_id:         string
          broker_link_id?: string | null
          name:            string
          currency?:       string
        }
        Update: {
          name?:           string
          broker_link_id?: string | null
        }
      }

      portfolio_holdings: {
        Row: {
          id:            string
          portfolio_id:  string
          symbol:        string
          quantity:      number
          avg_buy_price: number
          updated_at:    string
        }
        Insert: {
          id?:           string
          portfolio_id:  string
          symbol:        string
          quantity:      number
          avg_buy_price: number
        }
        Update: {
          quantity?:      number
          avg_buy_price?: number
          updated_at?:    string
        }
      }

      portfolio_transactions: {
        Row: {
          id:               string
          portfolio_id:     string
          symbol:           string
          type:             'BUY' | 'SELL'
          quantity:         number
          price:            number
          total_value:      number
          transaction_date: string
          notes:            string | null
          created_at:       string
        }
        Insert: {
          id?:              string
          portfolio_id:     string
          symbol:           string
          type:             'BUY' | 'SELL'
          quantity:         number
          price:            number
          total_value:      number
          transaction_date: string
          notes?:           string | null
        }
        Update: {
          notes?: string | null
        }
      }

      price_alerts: {
        Row: {
          id:           string
          user_id:      string
          symbol:       string
          condition:    'above' | 'below'
          target_price: number
          is_triggered: boolean
          triggered_at: string | null
          is_active:    boolean
          created_at:   string
        }
        Insert: {
          id?:          string
          user_id:      string
          symbol:       string
          condition:    'above' | 'below'
          target_price: number
          is_active?:   boolean
        }
        Update: {
          is_triggered?: boolean
          triggered_at?: string | null
          is_active?:    boolean
        }
      }

      saved_screens: {
        Row: {
          id:         string
          user_id:    string
          name:       string
          filters:    Record<string, unknown>
          is_public:  boolean
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          name:       string
          filters?:   Record<string, unknown>
          is_public?: boolean
        }
        Update: {
          name?:      string
          filters?:   Record<string, unknown>
          is_public?: boolean
        }
      }

      audit_logs: {
        Row: {
          id:         string
          user_id:    string | null
          action:     string
          resource:   string | null
          metadata:   Record<string, unknown>
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?:        string
          user_id?:   string | null
          action:     string
          resource?:  string | null
          metadata?:  Record<string, unknown>
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: never
      }

    }
  }
}
