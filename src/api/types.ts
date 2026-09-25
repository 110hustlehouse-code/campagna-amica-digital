export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          absence_date: string | null
          company_id: string
          created_at: string
          id: string
          market_id: string
          notes: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          absence_date?: string | null
          company_id: string
          created_at?: string
          id?: string
          market_id: string
          notes?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          absence_date?: string | null
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string
          notes?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          called_at: string
          endpoint: string
          user_id: string
        }
        Insert: {
          called_at?: string
          endpoint: string
          user_id: string
        }
        Update: {
          called_at?: string
          endpoint?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          category: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_registered: boolean
          logo_url: string | null
          market_ids: string[]
          market_schedules: Json
          name: string
          owner_id: string | null
          phone: string | null
          region: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_registered?: boolean
          logo_url?: string | null
          market_ids?: string[]
          market_schedules?: Json
          name: string
          owner_id?: string | null
          phone?: string | null
          region?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_registered?: boolean
          logo_url?: string | null
          market_ids?: string[]
          market_schedules?: Json
          name?: string
          owner_id?: string | null
          phone?: string | null
          region?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_market_assignments: {
        Row: {
          assigned_product_ids: string[]
          company_id: string
          created_at: string
          id: string
          market_event_id: string
          notes: string | null
          stand_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_product_ids?: string[]
          company_id: string
          created_at?: string
          id?: string
          market_event_id: string
          notes?: string | null
          stand_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_product_ids?: string[]
          company_id?: string
          created_at?: string
          id?: string
          market_event_id?: string
          notes?: string | null
          stand_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_market_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_market_assignments_market_event_id_fkey"
            columns: ["market_event_id"]
            isOneToOne: false
            referencedRelation: "market_events"
            referencedColumns: ["id"]
          },
        ]
      }
      company_market_escalations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          market_id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          market_id: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_market_escalations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_market_escalations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_market_escalations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      comuni: {
        Row: {
          cap_principale: string | null
          codice_istat: string
          nome: string
          provincia_sigla: string
        }
        Insert: {
          cap_principale?: string | null
          codice_istat: string
          nome: string
          provincia_sigla: string
        }
        Update: {
          cap_principale?: string | null
          codice_istat?: string
          nome?: string
          provincia_sigla?: string
        }
        Relationships: [
          {
            foreignKeyName: "comuni_provincia_sigla_fkey"
            columns: ["provincia_sigla"]
            isOneToOne: false
            referencedRelation: "province"
            referencedColumns: ["sigla"]
          },
          {
            foreignKeyName: "comuni_provincia_sigla_fkey"
            columns: ["provincia_sigla"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["provincia_sigla"]
          },
        ]
      }
      ddt_sequences: {
        Row: {
          company_id: string
          last_number: number
          year: number
        }
        Insert: {
          company_id: string
          last_number?: number
          year: number
        }
        Update: {
          company_id?: string
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ddt_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_items: {
        Row: {
          created_at: string
          delivery_note_id: string
          expiry_date: string | null
          id: string
          lot: string | null
          notes: string | null
          position: number
          product_id: string | null
          product_name: string
          quantity: number
          unit: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          delivery_note_id: string
          expiry_date?: string | null
          id?: string
          lot?: string | null
          notes?: string | null
          position?: number
          product_id?: string | null
          product_name: string
          quantity: number
          unit: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          delivery_note_id?: string
          expiry_date?: string | null
          id?: string
          lot?: string | null
          notes?: string | null
          position?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_sync_log: {
        Row: {
          action: string
          created_at: string
          delivery_note_id: string
          id: string
          payload: Json | null
          product_id: string | null
          quantity_delta: number | null
        }
        Insert: {
          action: string
          created_at?: string
          delivery_note_id: string
          id?: string
          payload?: Json | null
          product_id?: string | null
          quantity_delta?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          delivery_note_id?: string
          id?: string
          payload?: Json | null
          product_id?: string | null
          quantity_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_sync_log_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          annotazioni: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          causale: string
          company_id: string
          created_at: string
          id: string
          issue_date: string
          issued_at: string | null
          market_event_id: string | null
          market_id: string
          numero_colli: number | null
          pdf_url: string | null
          peso_totale_kg: number | null
          progressive_number: number | null
          progressive_year: number | null
          recipient_address: string | null
          recipient_cap: string | null
          recipient_city: string | null
          recipient_name: string
          recipient_vat_or_cf: string | null
          signature_method: string | null
          signature_required: boolean
          signed_at: string | null
          signed_by_recipient_user_id: string | null
          source: string
          status: string
          template_of: string | null
          transport_date: string
          trasporto_a_mezzo: string | null
          updated_at: string
          vettore_descrizione: string | null
        }
        Insert: {
          annotazioni?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          causale: string
          company_id: string
          created_at?: string
          id?: string
          issue_date: string
          issued_at?: string | null
          market_event_id?: string | null
          market_id: string
          numero_colli?: number | null
          pdf_url?: string | null
          peso_totale_kg?: number | null
          progressive_number?: number | null
          progressive_year?: number | null
          recipient_address?: string | null
          recipient_cap?: string | null
          recipient_city?: string | null
          recipient_name: string
          recipient_vat_or_cf?: string | null
          signature_method?: string | null
          signature_required?: boolean
          signed_at?: string | null
          signed_by_recipient_user_id?: string | null
          source?: string
          status?: string
          template_of?: string | null
          transport_date: string
          trasporto_a_mezzo?: string | null
          updated_at?: string
          vettore_descrizione?: string | null
        }
        Update: {
          annotazioni?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          causale?: string
          company_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          issued_at?: string | null
          market_event_id?: string | null
          market_id?: string
          numero_colli?: number | null
          pdf_url?: string | null
          peso_totale_kg?: number | null
          progressive_number?: number | null
          progressive_year?: number | null
          recipient_address?: string | null
          recipient_cap?: string | null
          recipient_city?: string | null
          recipient_name?: string
          recipient_vat_or_cf?: string | null
          signature_method?: string | null
          signature_required?: boolean
          signed_at?: string | null
          signed_by_recipient_user_id?: string | null
          source?: string
          status?: string
          template_of?: string | null
          transport_date?: string
          trasporto_a_mezzo?: string | null
          updated_at?: string
          vettore_descrizione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_market_event_id_fkey"
            columns: ["market_event_id"]
            isOneToOne: false
            referencedRelation: "market_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_signed_by_recipient_user_id_fkey"
            columns: ["signed_by_recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_template_of_fkey"
            columns: ["template_of"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          market_id: string | null
          product_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          market_id?: string | null
          product_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          market_id?: string | null
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_events: {
        Row: {
          capacity: number | null
          created_at: string
          event_date: string
          id: string
          market_id: string
          registered_company_ids: string[]
          time_end: string | null
          time_start: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          event_date: string
          id?: string
          market_id: string
          registered_company_ids?: string[]
          time_end?: string | null
          time_start?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          event_date?: string
          id?: string
          market_id?: string
          registered_company_ids?: string[]
          time_end?: string | null
          time_start?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_events_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_events_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          address: string | null
          attivo: boolean
          city: string
          codice_mercato: string | null
          company_ids: string[]
          comune_istat: string | null
          created_at: string
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          quartiere_id: string | null
          recurring_days: number[]
          recurring_time_end: string | null
          recurring_time_start: string | null
          region: string | null
          schedule: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          attivo?: boolean
          city: string
          codice_mercato?: string | null
          company_ids?: string[]
          comune_istat?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          quartiere_id?: string | null
          recurring_days?: number[]
          recurring_time_end?: string | null
          recurring_time_start?: string | null
          region?: string | null
          schedule?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          attivo?: boolean
          city?: string
          codice_mercato?: string | null
          company_ids?: string[]
          comune_istat?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          quartiere_id?: string | null
          recurring_days?: number[]
          recurring_time_end?: string | null
          recurring_time_start?: string | null
          region?: string | null
          schedule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "markets_comune_istat_fkey"
            columns: ["comune_istat"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["codice_istat"]
          },
          {
            foreignKeyName: "markets_comune_istat_fkey"
            columns: ["comune_istat"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["comune_istat"]
          },
          {
            foreignKeyName: "markets_quartiere_id_fkey"
            columns: ["quartiere_id"]
            isOneToOne: false
            referencedRelation: "quartieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_quartiere_id_fkey"
            columns: ["quartiere_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["quartiere_id"]
          },
        ]
      }
      missing_ddt_reports: {
        Row: {
          company_id: string
          created_at: string
          data_evento: string
          detected_at: string
          id: string
          market_id: string
          staff_action: string | null
          staff_action_at: string | null
          staff_note: string | null
          staff_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_evento: string
          detected_at?: string
          id?: string
          market_id: string
          staff_action?: string | null
          staff_action_at?: string | null
          staff_note?: string | null
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_evento?: string
          detected_at?: string
          id?: string
          market_id?: string
          staff_action?: string | null
          staff_action_at?: string | null
          staff_note?: string | null
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_ddt_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_ddt_reports_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_ddt_reports_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_ddt_reports_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      news_cache: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          source: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          source: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          source?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          message: string | null
          message_id: string | null
          order_id: string | null
          product_id: string | null
          read: boolean
          title: string
          type: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          message_id?: string | null
          order_id?: string | null
          product_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          message_id?: string | null
          order_id?: string | null
          product_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          company_name: string | null
          created_at: string
          id: string
          items: Json
          market_id: string
          market_name: string | null
          notes: string | null
          pickup_date: string | null
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          company_name?: string | null
          created_at?: string
          id?: string
          items?: Json
          market_id: string
          market_name?: string | null
          notes?: string | null
          pickup_date?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          company_name?: string | null
          created_at?: string
          id?: string
          items?: Json
          market_id?: string
          market_name?: string | null
          notes?: string | null
          pickup_date?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_event_rsvps: {
        Row: {
          company_id: string
          created_at: string
          id: string
          market_id: string
          message_id: string
          producer_email: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          market_id: string
          message_id: string
          producer_email: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string
          message_id?: string
          producer_email?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producer_event_rsvps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_needs: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          market_id: string
          notes: string | null
          payment_status: string
          price: number | null
          priority: string
          quantity: number | null
          size: string | null
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          market_id: string
          notes?: string | null
          payment_status?: string
          price?: number | null
          priority?: string
          quantity?: number | null
          size?: string | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          market_id?: string
          notes?: string | null
          payment_status?: string
          price?: number | null
          priority?: string
          quantity?: number | null
          size?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_needs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_needs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_needs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reseller_prices: {
        Row: {
          created_at: string
          id: string
          price: number
          pricelist_id: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          pricelist_id: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          pricelist_id?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reseller_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stocks: {
        Row: {
          carried_over_from_event_id: string | null
          company_id: string
          created_at: string
          id: string
          is_carried_over: boolean
          min_threshold: number | null
          notes: string | null
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          carried_over_from_event_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_carried_over?: boolean
          min_threshold?: number | null
          notes?: string | null
          product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          carried_over_from_event_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_carried_over?: boolean
          min_threshold?: number | null
          notes?: string | null
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stocks_carried_over_from_event_id_fkey"
            columns: ["carried_over_from_event_id"]
            isOneToOne: false
            referencedRelation: "market_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          box_configs: string | null
          category: string | null
          code: string | null
          company_id: string
          contains_celery: boolean
          contains_crustaceans: boolean
          contains_eggs: boolean
          contains_fish: boolean
          contains_gluten: boolean
          contains_lupin: boolean
          contains_milk: boolean
          contains_molluscs: boolean
          contains_mustard: boolean
          contains_nuts: boolean
          contains_peanuts: boolean
          contains_sesame: boolean
          contains_soy: boolean
          contains_sulphites: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          ingredients: string | null
          name: string
          price: number
          unit: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          available?: boolean
          box_configs?: string | null
          category?: string | null
          code?: string | null
          company_id: string
          contains_celery?: boolean
          contains_crustaceans?: boolean
          contains_eggs?: boolean
          contains_fish?: boolean
          contains_gluten?: boolean
          contains_lupin?: boolean
          contains_milk?: boolean
          contains_molluscs?: boolean
          contains_mustard?: boolean
          contains_nuts?: boolean
          contains_peanuts?: boolean
          contains_sesame?: boolean
          contains_soy?: boolean
          contains_sulphites?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          name: string
          price: number
          unit?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          available?: boolean
          box_configs?: string | null
          category?: string | null
          code?: string | null
          company_id?: string
          contains_celery?: boolean
          contains_crustaceans?: boolean
          contains_eggs?: boolean
          contains_fish?: boolean
          contains_gluten?: boolean
          contains_lupin?: boolean
          contains_milk?: boolean
          contains_molluscs?: boolean
          contains_mustard?: boolean
          contains_nuts?: boolean
          contains_peanuts?: boolean
          contains_sesame?: boolean
          contains_soy?: boolean
          contains_sulphites?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          name?: string
          price?: number
          unit?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      province: {
        Row: {
          codice_istat: string
          nome: string
          regione_istat: string
          sigla: string
        }
        Insert: {
          codice_istat: string
          nome: string
          regione_istat: string
          sigla: string
        }
        Update: {
          codice_istat?: string
          nome?: string
          regione_istat?: string
          sigla?: string
        }
        Relationships: [
          {
            foreignKeyName: "province_regione_istat_fkey"
            columns: ["regione_istat"]
            isOneToOne: false
            referencedRelation: "regioni"
            referencedColumns: ["codice_istat"]
          },
          {
            foreignKeyName: "province_regione_istat_fkey"
            columns: ["regione_istat"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["regione_istat"]
          },
        ]
      }
      punti_eventi: {
        Row: {
          annulla_evento: string | null
          company_id: string | null
          created_at: string
          fonte: string
          giorno: string
          id: string
          market_id: string | null
          note: string | null
          order_id: string | null
          punti: number
          revisionato_da: string | null
          revisionato_il: string | null
          riferimento: string | null
          stato: string
          tessera_id: string
        }
        Insert: {
          annulla_evento?: string | null
          company_id?: string | null
          created_at?: string
          fonte: string
          giorno?: string
          id?: string
          market_id?: string | null
          note?: string | null
          order_id?: string | null
          punti: number
          revisionato_da?: string | null
          revisionato_il?: string | null
          riferimento?: string | null
          stato?: string
          tessera_id: string
        }
        Update: {
          annulla_evento?: string | null
          company_id?: string | null
          created_at?: string
          fonte?: string
          giorno?: string
          id?: string
          market_id?: string | null
          note?: string | null
          order_id?: string | null
          punti?: number
          revisionato_da?: string | null
          revisionato_il?: string | null
          riferimento?: string | null
          stato?: string
          tessera_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punti_eventi_annulla_evento_fkey"
            columns: ["annulla_evento"]
            isOneToOne: false
            referencedRelation: "punti_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_revisionato_da_fkey"
            columns: ["revisionato_da"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "tessere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "v_tessere_saldo"
            referencedColumns: ["tessera_id"]
          },
        ]
      }
      punti_regole: {
        Row: {
          attiva: boolean
          descrizione: string | null
          fonte: string
          id: string
          market_id: string | null
          punti: number
          richiede_revisione: boolean
          tetto_giorno: number | null
          updated_at: string
        }
        Insert: {
          attiva?: boolean
          descrizione?: string | null
          fonte: string
          id?: string
          market_id?: string | null
          punti: number
          richiede_revisione?: boolean
          tetto_giorno?: number | null
          updated_at?: string
        }
        Update: {
          attiva?: boolean
          descrizione?: string | null
          fonte?: string
          id?: string
          market_id?: string | null
          punti?: number
          richiede_revisione?: boolean
          tetto_giorno?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punti_regole_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_regole_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      quartieri: {
        Row: {
          comune_istat: string
          id: string
          municipio: string | null
          nome: string
        }
        Insert: {
          comune_istat: string
          id?: string
          municipio?: string | null
          nome: string
        }
        Update: {
          comune_istat?: string
          id?: string
          municipio?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "quartieri_comune_istat_fkey"
            columns: ["comune_istat"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["codice_istat"]
          },
          {
            foreignKeyName: "quartieri_comune_istat_fkey"
            columns: ["comune_istat"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["comune_istat"]
          },
        ]
      }
      regioni: {
        Row: {
          codice_istat: string
          nome: string
          ripartizione: string
        }
        Insert: {
          codice_istat: string
          nome: string
          ripartizione: string
        }
        Update: {
          codice_istat?: string
          nome?: string
          ripartizione?: string
        }
        Relationships: []
      }
      rental_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          market_id: string
          payment_date: string | null
          payment_method: string | null
          period_month: number
          period_year: number
          receipt_url: string | null
          stall_rental_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          market_id: string
          payment_date?: string | null
          payment_method?: string | null
          period_month: number
          period_year: number
          receipt_url?: string | null
          stall_rental_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string
          payment_date?: string | null
          payment_method?: string | null
          period_month?: number
          period_year?: number
          receipt_url?: string | null
          stall_rental_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_stall_rental_id_fkey"
            columns: ["stall_rental_id"]
            isOneToOne: false
            referencedRelation: "stall_rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_login_attempts: {
        Row: {
          attempted_at: string
          company_id: string
          id: string
          ip_address: string
        }
        Insert: {
          attempted_at?: string
          company_id: string
          id?: string
          ip_address: string
        }
        Update: {
          attempted_at?: string
          company_id?: string
          id?: string
          ip_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_login_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_passwords: {
        Row: {
          company_id: string
          created_at: string
          id: string
          label: string | null
          password_hash: string
          password_salt: string
          pricelist_id: number
          revoked_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          label?: string | null
          password_hash: string
          password_salt: string
          pricelist_id: number
          revoked_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          label?: string | null
          password_hash?: string
          password_salt?: string
          pricelist_id?: number
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_passwords_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string | null
          rating: number
          reply: string | null
          reply_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          rating: number
          reply?: string | null
          reply_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          rating?: number
          reply?: string | null
          reply_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_alert_reports: {
        Row: {
          company_id: string
          created_at: string
          delivery_note_id: string
          delivery_note_item_id: string
          id: string
          market_id: string
          month_detected: number
          product_name: string
          season_months: number[]
          seasonal_match: string
          staff_action_at: string | null
          staff_note: string | null
          staff_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delivery_note_id: string
          delivery_note_item_id: string
          id?: string
          market_id: string
          month_detected: number
          product_name: string
          season_months: number[]
          seasonal_match: string
          staff_action_at?: string | null
          staff_note?: string | null
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delivery_note_id?: string
          delivery_note_item_id?: string
          id?: string
          market_id?: string
          month_detected?: number
          product_name?: string
          season_months?: number[]
          seasonal_match?: string
          staff_action_at?: string | null
          staff_note?: string | null
          staff_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_alert_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_alert_reports_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_alert_reports_delivery_note_item_id_fkey"
            columns: ["delivery_note_item_id"]
            isOneToOne: true
            referencedRelation: "delivery_note_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_alert_reports_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_alert_reports_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_alert_reports_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_products: {
        Row: {
          category: string
          created_at: string
          id: string
          match_key: string
          months: number[]
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          match_key: string
          months: number[]
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          match_key?: string
          months?: number[]
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          market_confirmed: boolean
          market_id: string
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          market_confirmed?: boolean
          market_id: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          market_confirmed?: boolean
          market_id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_message_reads: {
        Row: {
          company_id: string | null
          created_at: string
          feedback: string | null
          id: string
          message_id: string
          producer_email: string
          read_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          message_id: string
          producer_email: string
          read_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          message_id?: string
          producer_email?: string
          read_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_message_reads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          attachments: Json
          created_at: string
          created_by: string | null
          description: string | null
          details: string | null
          event_date: string
          id: string
          is_mandatory: boolean
          is_published: boolean
          location: string
          market_id: string | null
          time_end: string | null
          time_start: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: string | null
          event_date: string
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          location: string
          market_id?: string | null
          time_end?: string | null
          time_start?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: string | null
          event_date?: string
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          location?: string
          market_id?: string | null
          time_end?: string | null
          time_start?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_messages_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_rentals: {
        Row: {
          company_id: string
          created_at: string
          id: string
          market_id: string
          monthly_rent: number
          payment_method: string | null
          rental_end_date: string | null
          rental_start_date: string
          stall_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          market_id: string
          monthly_rent: number
          payment_method?: string | null
          rental_end_date?: string | null
          rental_start_date: string
          stall_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string
          monthly_rent?: number
          payment_method?: string | null
          rental_end_date?: string | null
          rental_start_date?: string
          stall_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_rentals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_rentals_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_rentals_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_sanctions: {
        Row: {
          blocked_from: string | null
          blocked_until: string | null
          company_id: string
          created_at: string
          id: string
          issued_by: string
          lift_reason: string | null
          lifted_at: string | null
          lifted_by: string | null
          market_id: string
          reason: string
          report_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          blocked_from?: string | null
          blocked_until?: string | null
          company_id: string
          created_at?: string
          id?: string
          issued_by: string
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          market_id: string
          reason: string
          report_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          blocked_from?: string | null
          blocked_until?: string | null
          company_id?: string
          created_at?: string
          id?: string
          issued_by?: string
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          market_id?: string
          reason?: string
          report_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_sanctions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_sanctions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_sanctions_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_sanctions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_sanctions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_sanctions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "missing_ddt_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bag_size: string | null
          category: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          supplier_company_id: string | null
          supplier_type: string | null
          updated_at: string
        }
        Insert: {
          bag_size?: string | null
          category?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          supplier_company_id?: string | null
          supplier_type?: string | null
          updated_at?: string
        }
        Update: {
          bag_size?: string | null
          category?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          supplier_company_id?: string | null
          supplier_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tessere: {
        Row: {
          codice: string
          created_at: string
          created_by: string | null
          data_emissione: string
          data_scadenza: string | null
          id: string
          intestatario: string | null
          market_id: string | null
          note: string | null
          qr_payload: string
          stato: string
          tipo: string
          ultimo_utilizzo: string | null
          updated_at: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          codice: string
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          data_scadenza?: string | null
          id?: string
          intestatario?: string | null
          market_id?: string | null
          note?: string | null
          qr_payload: string
          stato?: string
          tipo?: string
          ultimo_utilizzo?: string | null
          updated_at?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          codice?: string
          created_at?: string
          created_by?: string | null
          data_emissione?: string
          data_scadenza?: string | null
          id?: string
          intestatario?: string | null
          market_id?: string | null
          note?: string | null
          qr_payload?: string
          stato?: string
          tipo?: string
          ultimo_utilizzo?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tessere_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessere_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessere_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          role_confirmed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          role_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          role_confirmed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_markets_territorio: {
        Row: {
          attivo: boolean | null
          comune: string | null
          comune_istat: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          mercato: string | null
          municipio: string | null
          provincia: string | null
          provincia_sigla: string | null
          quartiere: string | null
          quartiere_id: string | null
          regione: string | null
          regione_istat: string | null
          ripartizione: string | null
        }
        Relationships: []
      }
      v_tessere_saldo: {
        Row: {
          market_id: string | null
          punti_in_sospeso: number | null
          punti_validi: number | null
          stato: string | null
          tessera_id: string | null
          ultimo_movimento: string | null
          user_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tessere_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessere_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "v_markets_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aziende_in_ambito: {
        Args: { p_ambito?: string; p_livello?: string }
        Returns: string[]
      }
      blocco_attivo_fino_a: {
        Args: { p_company_id: string; p_market_id: string }
        Returns: string
      }
      composizione_fatturato: {
        Args: {
          p_al?: string
          p_ambito?: string
          p_dal?: string
          p_limite?: number
          p_livello?: string
        }
        Returns: {
          etichetta: string
          numero: number
          quantita: number
          tipo: string
          valore: number
        }[]
      }
      ddt_nazionali: {
        Args: {
          p_al?: string
          p_dal?: string
          p_limite?: number
          p_regione?: string
          p_stato?: string
        }
        Returns: {
          causale: string
          comune: string
          data_documento: string
          destinatario: string
          firmato: boolean
          id: string
          mercato: string
          mittente: string
          numero_completo: string
          provincia: string
          quantita: number
          regione: string
          stato: string
          valore: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_service_role_key: { Args: never; Returns: string }
      get_supabase_url: { Args: never; Returns: string }
      get_webhook_secret: { Args: never; Returns: string }
      increment_ddt_sequence: {
        Args: { p_company_id: string; p_year: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_direzione: { Args: never; Returns: boolean }
      is_market_open_on: {
        Args: { p_data: string; p_market_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_staff_for_market: { Args: { p_market_id: string }; Returns: boolean }
      mercati_in_ambito: {
        Args: { p_ambito?: string; p_livello?: string }
        Returns: string[]
      }
      metriche_operative: {
        Args: {
          p_al?: string
          p_ambito?: string
          p_dal?: string
          p_livello?: string
        }
        Returns: {
          affitti_non_saldati: number
          aziende_con_catalogo: number
          aziende_con_ddt: number
          aziende_dormienti: number
          aziende_totali: number
          bisogni_aperti: number
          clienti_con_ordini: number
          clienti_ricorrenti: number
          ddt_firma_media_gg: number
          ddt_non_firmati: number
          ordini_totali: number
          prodotti_disponibili: number
          prodotti_totali: number
          recensione_media: number
          scontrino_medio: number
        }[]
      }
      metriche_territorio: {
        Args: {
          p_al?: string
          p_ambito?: string
          p_dal?: string
          p_livello?: string
        }
        Returns: {
          aziende: number
          chiave: string
          ddt_consegnati: number
          ddt_emessi: number
          mercati: number
          nome: string
          ordini: number
          prodotti: number
          quantita_totale: number
          valore_merce: number
        }[]
      }
      next_ddt_number: {
        Args: { p_company_id: string; p_year: number }
        Returns: number
      }
      orario_apertura_mercato: {
        Args: { p_data: string; p_market_id: string }
        Returns: string
      }
      owns_company: { Args: { p_company_id: string }; Returns: boolean }
      puo_leggere_rete: { Args: never; Returns: boolean }
      purge_old_rate_limits: { Args: never; Returns: undefined }
      riepilogo_nazionale: {
        Args: { p_al?: string; p_dal?: string }
        Returns: {
          aziende: number
          clienti: number
          ddt_annullati: number
          ddt_consegnati: number
          ddt_emessi: number
          mercati_attivi: number
          ordini: number
          produttori: number
          quantita_totale: number
          regioni_coperte: number
          valore_merce: number
        }[]
      }
      serie_storica_fatturato: {
        Args: { p_ambito?: string; p_livello?: string; p_mesi?: number }
        Returns: {
          affitti_valore: number
          aziende_attive: number
          clienti_attivi: number
          ddt_numero: number
          merce_quantita: number
          merce_valore: number
          mese: string
          ordini_numero: number
          ordini_valore: number
          righe_con_prezzo: number
          righe_totali: number
        }[]
      }
      sincronizza_mercati_azienda: {
        Args: { p_company_id: string; p_market_ids: string[] }
        Returns: undefined
      }
      stato_disponibilita_azienda: {
        Args: { p_company_id: string; p_data?: string; p_market_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
