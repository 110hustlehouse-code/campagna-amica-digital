// GENERATO AUTOMATICAMENTE — non modificare a mano.
// Rigenerare con: npm run gen:types

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      absences: {
        Row: {
          id: string
          company_id: string
          market_id: string
          absence_date: string | null
          reason: string | null
          status: "reported" | "acknowledged" | "resolved"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          market_id: string
          absence_date?: string | null
          reason?: string | null
          status?: "reported" | "acknowledged" | "resolved"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          market_id?: string
          absence_date?: string | null
          reason?: string | null
          status?: "reported" | "acknowledged" | "resolved"
          notes?: string | null
          created_at?: string
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
        ]
      }
      api_rate_limits: {
        Row: {
          user_id: string
          endpoint: string
          called_at: string
        }
        Insert: {
          user_id: string
          endpoint: string
          called_at?: string
        }
        Update: {
          user_id?: string
          endpoint?: string
          called_at?: string
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
          id: string
          owner_id: string | null
          name: string
          description: string | null
          website: string | null
          logo_url: string | null
          cover_image_url: string | null
          category: "ortofrutticola" | "lattiero_casearia" | "vinicola" | "olearia" | "cerealicola" | "zootecnica" | "apicoltura" | "altro" | null
          region: string | null
          city: string | null
          phone: string | null
          email: string | null
          market_ids: string[]
          market_schedules: Json
          is_registered: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          description?: string | null
          website?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          category?: "ortofrutticola" | "lattiero_casearia" | "vinicola" | "olearia" | "cerealicola" | "zootecnica" | "apicoltura" | "altro" | null
          region?: string | null
          city?: string | null
          phone?: string | null
          email?: string | null
          market_ids?: string[]
          market_schedules?: Json
          is_registered?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          description?: string | null
          website?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          category?: "ortofrutticola" | "lattiero_casearia" | "vinicola" | "olearia" | "cerealicola" | "zootecnica" | "apicoltura" | "altro" | null
          region?: string | null
          city?: string | null
          phone?: string | null
          email?: string | null
          market_ids?: string[]
          market_schedules?: Json
          is_registered?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_market_assignments: {
        Row: {
          id: string
          company_id: string
          market_event_id: string
          assigned_product_ids: string[]
          stand_number: string | null
          status: "pending" | "confirmed" | "completed" | "cancelled"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          market_event_id: string
          assigned_product_ids?: string[]
          stand_number?: string | null
          status?: "pending" | "confirmed" | "completed" | "cancelled"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          market_event_id?: string
          assigned_product_ids?: string[]
          stand_number?: string | null
          status?: "pending" | "confirmed" | "completed" | "cancelled"
          notes?: string | null
          created_at?: string
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
      comuni: {
        Row: {
          codice_istat: string
          nome: string
          provincia_sigla: string
          cap_principale: string | null
        }
        Insert: {
          codice_istat: string
          nome: string
          provincia_sigla: string
          cap_principale?: string | null
        }
        Update: {
          codice_istat?: string
          nome?: string
          provincia_sigla?: string
          cap_principale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comuni_provincia_sigla_fkey"
            columns: ["provincia_sigla"]
            isOneToOne: false
            referencedRelation: "province"
            referencedColumns: ["sigla"]
          },
        ]
      }
      ddt_sequences: {
        Row: {
          company_id: string
          year: number
          last_number: number
        }
        Insert: {
          company_id: string
          year: number
          last_number?: number
        }
        Update: {
          company_id?: string
          year?: number
          last_number?: number
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
          id: string
          delivery_note_id: string
          product_id: string | null
          product_name: string
          unit: string
          quantity: number
          lot: string | null
          expiry_date: string | null
          weight_kg: number | null
          notes: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          delivery_note_id: string
          product_id?: string | null
          product_name: string
          unit: string
          quantity: number
          lot?: string | null
          expiry_date?: string | null
          weight_kg?: number | null
          notes?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          delivery_note_id?: string
          product_id?: string | null
          product_name?: string
          unit?: string
          quantity?: number
          lot?: string | null
          expiry_date?: string | null
          weight_kg?: number | null
          notes?: string | null
          position?: number
          created_at?: string
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
          id: string
          delivery_note_id: string
          action: "product_created" | "product_matched" | "stock_incremented" | "stock_reverted"
          product_id: string | null
          quantity_delta: number | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          delivery_note_id: string
          action: "product_created" | "product_matched" | "stock_incremented" | "stock_reverted"
          product_id?: string | null
          quantity_delta?: number | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          delivery_note_id?: string
          action?: "product_created" | "product_matched" | "stock_incremented" | "stock_reverted"
          product_id?: string | null
          quantity_delta?: number | null
          payload?: Json | null
          created_at?: string
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
          id: string
          company_id: string
          market_id: string
          market_event_id: string
          progressive_number: number | null
          progressive_year: number | null
          issue_date: string
          transport_date: string
          issued_at: string | null
          cancelled_at: string | null
          recipient_name: string
          recipient_vat_or_cf: string | null
          recipient_address: string | null
          recipient_city: string | null
          recipient_cap: string | null
          causale: "vendita" | "conto_vendita" | "conto_deposito" | "reso" | "omaggio" | "campionatura" | "conto_lavorazione" | "conto_visione" | "trasferimento_interno"
          trasporto_a_mezzo: "mittente" | "vettore" | "destinatario" | null
          vettore_descrizione: string | null
          numero_colli: number | null
          peso_totale_kg: number | null
          annotazioni: string | null
          signature_required: boolean
          signed_by_recipient_user_id: string | null
          signed_at: string | null
          signature_method: "digital_in_app" | "not_required" | null
          status: "draft" | "issued" | "cancelled"
          cancellation_reason: string | null
          source: "manual_form" | "ai_upload" | "reused_template"
          template_of: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          market_id: string
          market_event_id: string
          progressive_number?: number | null
          progressive_year?: number | null
          issue_date: string
          transport_date: string
          issued_at?: string | null
          cancelled_at?: string | null
          recipient_name: string
          recipient_vat_or_cf?: string | null
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_cap?: string | null
          causale: "vendita" | "conto_vendita" | "conto_deposito" | "reso" | "omaggio" | "campionatura" | "conto_lavorazione" | "conto_visione" | "trasferimento_interno"
          trasporto_a_mezzo?: "mittente" | "vettore" | "destinatario" | null
          vettore_descrizione?: string | null
          numero_colli?: number | null
          peso_totale_kg?: number | null
          annotazioni?: string | null
          signature_required?: boolean
          signed_by_recipient_user_id?: string | null
          signed_at?: string | null
          signature_method?: "digital_in_app" | "not_required" | null
          status?: "draft" | "issued" | "cancelled"
          cancellation_reason?: string | null
          source?: "manual_form" | "ai_upload" | "reused_template"
          template_of?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          market_id?: string
          market_event_id?: string
          progressive_number?: number | null
          progressive_year?: number | null
          issue_date?: string
          transport_date?: string
          issued_at?: string | null
          cancelled_at?: string | null
          recipient_name?: string
          recipient_vat_or_cf?: string | null
          recipient_address?: string | null
          recipient_city?: string | null
          recipient_cap?: string | null
          causale?: "vendita" | "conto_vendita" | "conto_deposito" | "reso" | "omaggio" | "campionatura" | "conto_lavorazione" | "conto_visione" | "trasferimento_interno"
          trasporto_a_mezzo?: "mittente" | "vettore" | "destinatario" | null
          vettore_descrizione?: string | null
          numero_colli?: number | null
          peso_totale_kg?: number | null
          annotazioni?: string | null
          signature_required?: boolean
          signed_by_recipient_user_id?: string | null
          signed_at?: string | null
          signature_method?: "digital_in_app" | "not_required" | null
          status?: "draft" | "issued" | "cancelled"
          cancellation_reason?: string | null
          source?: "manual_form" | "ai_upload" | "reused_template"
          template_of?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
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
            foreignKeyName: "delivery_notes_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
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
          id: string
          user_id: string
          company_id: string | null
          market_id: string | null
          product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          market_id?: string | null
          product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          market_id?: string | null
          product_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
        ]
      }
      market_events: {
        Row: {
          id: string
          market_id: string
          event_date: string
          time_start: string | null
          time_end: string | null
          title: string | null
          capacity: number | null
          registered_company_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          market_id: string
          event_date: string
          time_start?: string | null
          time_end?: string | null
          title?: string | null
          capacity?: number | null
          registered_company_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          event_date?: string
          time_start?: string | null
          time_end?: string | null
          title?: string | null
          capacity?: number | null
          registered_company_ids?: string[]
          created_at?: string
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
        ]
      }
      markets: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string
          region: string | null
          latitude: number | null
          longitude: number | null
          schedule: string | null
          image_url: string | null
          company_ids: string[]
          created_at: string
          updated_at: string
          comune_istat: string | null
          quartiere_id: string | null
          codice_mercato: string | null
          attivo: boolean
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city: string
          region?: string | null
          latitude?: number | null
          longitude?: number | null
          schedule?: string | null
          image_url?: string | null
          company_ids?: string[]
          created_at?: string
          updated_at?: string
          comune_istat?: string | null
          quartiere_id?: string | null
          codice_mercato?: string | null
          attivo?: boolean
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string
          region?: string | null
          latitude?: number | null
          longitude?: number | null
          schedule?: string | null
          image_url?: string | null
          company_ids?: string[]
          created_at?: string
          updated_at?: string
          comune_istat?: string | null
          quartiere_id?: string | null
          codice_mercato?: string | null
          attivo?: boolean
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
            foreignKeyName: "markets_quartiere_id_fkey"
            columns: ["quartiere_id"]
            isOneToOne: false
            referencedRelation: "quartieri"
            referencedColumns: ["id"]
          },
        ]
      }
      news_cache: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string | null
          url: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date?: string | null
          url?: string | null
          source: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string | null
          url?: string | null
          source?: string
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          user_email: string
          title: string
          message: string | null
          type: "new_product" | "order_update" | "generic"
          company_id: string | null
          product_id: string | null
          order_id: string | null
          message_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email: string
          title: string
          message?: string | null
          type?: "new_product" | "order_update" | "generic"
          company_id?: string | null
          product_id?: string | null
          order_id?: string | null
          message_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string
          title?: string
          message?: string | null
          type?: "new_product" | "order_update" | "generic"
          company_id?: string | null
          product_id?: string | null
          order_id?: string | null
          message_id?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          company_id: string
          company_name: string | null
          market_id: string
          market_name: string | null
          items: Json
          total_amount: number | null
          status: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id: string
          company_name?: string | null
          market_id: string
          market_name?: string | null
          items?: Json
          total_amount?: number | null
          status?: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          company_id?: string
          company_name?: string | null
          market_id?: string
          market_name?: string | null
          items?: Json
          total_amount?: number | null
          status?: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
        ]
      }
      producer_event_rsvps: {
        Row: {
          id: string
          message_id: string
          company_id: string
          user_id: string | null
          producer_email: string
          market_id: string
          status: "pending" | "accepted" | "declined"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_id: string
          company_id: string
          user_id?: string | null
          producer_email: string
          market_id: string
          status?: "pending" | "accepted" | "declined"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          company_id?: string
          user_id?: string | null
          producer_email?: string
          market_id?: string
          status?: "pending" | "accepted" | "declined"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_event_rsvps_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_event_rsvps_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_needs: {
        Row: {
          id: string
          company_id: string
          market_id: string
          category: "bags" | "materials" | "urgent" | "maintenance" | "other"
          title: string
          description: string | null
          size: string | null
          price: number | null
          quantity: number | null
          payment_status: "unpaid" | "paid"
          priority: "low" | "medium" | "high"
          status: "open" | "in_progress" | "resolved" | "closed"
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
          source: string | null
        }
        Insert: {
          id?: string
          company_id: string
          market_id: string
          category: "bags" | "materials" | "urgent" | "maintenance" | "other"
          title: string
          description?: string | null
          size?: string | null
          price?: number | null
          quantity?: number | null
          payment_status?: "unpaid" | "paid"
          priority?: "low" | "medium" | "high"
          status?: "open" | "in_progress" | "resolved" | "closed"
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          source?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          market_id?: string
          category?: "bags" | "materials" | "urgent" | "maintenance" | "other"
          title?: string
          description?: string | null
          size?: string | null
          price?: number | null
          quantity?: number | null
          payment_status?: "unpaid" | "paid"
          priority?: "low" | "medium" | "high"
          status?: "open" | "in_progress" | "resolved" | "closed"
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          source?: string | null
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
        ]
      }
      product_stocks: {
        Row: {
          id: string
          company_id: string
          product_id: string
          quantity: number
          min_threshold: number | null
          notes: string | null
          created_at: string
          updated_at: string
          is_carried_over: boolean
          carried_over_from_event_id: string | null
        }
        Insert: {
          id?: string
          company_id: string
          product_id: string
          quantity: number
          min_threshold?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          is_carried_over?: boolean
          carried_over_from_event_id?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string
          quantity?: number
          min_threshold?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          is_carried_over?: boolean
          carried_over_from_event_id?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "product_stocks_carried_over_from_event_id_fkey"
            columns: ["carried_over_from_event_id"]
            isOneToOne: false
            referencedRelation: "market_events"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          price: number
          unit: "kg" | "lt" | "pz" | "confezione" | null
          image_url: string | null
          category: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          price: number
          unit?: "kg" | "lt" | "pz" | "confezione" | null
          image_url?: string | null
          category?: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          price?: number
          unit?: "kg" | "lt" | "pz" | "confezione" | null
          image_url?: string | null
          category?: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          available?: boolean
          created_at?: string
          updated_at?: string
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
          sigla: string
          nome: string
          codice_istat: string
          regione_istat: string
        }
        Insert: {
          sigla: string
          nome: string
          codice_istat: string
          regione_istat: string
        }
        Update: {
          sigla?: string
          nome?: string
          codice_istat?: string
          regione_istat?: string
        }
        Relationships: [
          {
            foreignKeyName: "province_regione_istat_fkey"
            columns: ["regione_istat"]
            isOneToOne: false
            referencedRelation: "regioni"
            referencedColumns: ["codice_istat"]
          },
        ]
      }
      punti_eventi: {
        Row: {
          id: string
          tessera_id: string
          fonte: string
          punti: number
          stato: "valido" | "in_sospeso" | "rifiutato" | "annullato"
          market_id: string | null
          company_id: string | null
          order_id: string | null
          giorno: string
          riferimento: string | null
          annulla_evento: string | null
          revisionato_da: string | null
          revisionato_il: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tessera_id: string
          fonte: string
          punti: number
          stato?: "valido" | "in_sospeso" | "rifiutato" | "annullato"
          market_id?: string | null
          company_id?: string | null
          order_id?: string | null
          giorno?: string
          riferimento?: string | null
          annulla_evento?: string | null
          revisionato_da?: string | null
          revisionato_il?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tessera_id?: string
          fonte?: string
          punti?: number
          stato?: "valido" | "in_sospeso" | "rifiutato" | "annullato"
          market_id?: string | null
          company_id?: string | null
          order_id?: string | null
          giorno?: string
          riferimento?: string | null
          annulla_evento?: string | null
          revisionato_da?: string | null
          revisionato_il?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punti_eventi_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "tessere"
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
            foreignKeyName: "punti_eventi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "punti_eventi_annulla_evento_fkey"
            columns: ["annulla_evento"]
            isOneToOne: false
            referencedRelation: "punti_eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punti_eventi_revisionato_da_fkey"
            columns: ["revisionato_da"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      punti_regole: {
        Row: {
          id: string
          fonte: string
          market_id: string | null
          punti: number
          tetto_giorno: number | null
          attiva: boolean
          richiede_revisione: boolean
          descrizione: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          fonte: string
          market_id?: string | null
          punti: number
          tetto_giorno?: number | null
          attiva?: boolean
          richiede_revisione?: boolean
          descrizione?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          fonte?: string
          market_id?: string | null
          punti?: number
          tetto_giorno?: number | null
          attiva?: boolean
          richiede_revisione?: boolean
          descrizione?: string | null
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
        ]
      }
      quartieri: {
        Row: {
          id: string
          nome: string
          comune_istat: string
          municipio: string | null
        }
        Insert: {
          id?: string
          nome: string
          comune_istat: string
          municipio?: string | null
        }
        Update: {
          id?: string
          nome?: string
          comune_istat?: string
          municipio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quartieri_comune_istat_fkey"
            columns: ["comune_istat"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["codice_istat"]
          },
        ]
      }
      regioni: {
        Row: {
          codice_istat: string
          nome: string
          ripartizione: "Nord-ovest" | "Nord-est" | "Centro" | "Sud" | "Isole"
        }
        Insert: {
          codice_istat: string
          nome: string
          ripartizione: "Nord-ovest" | "Nord-est" | "Centro" | "Sud" | "Isole"
        }
        Update: {
          codice_istat?: string
          nome?: string
          ripartizione?: "Nord-ovest" | "Nord-est" | "Centro" | "Sud" | "Isole"
        }
        Relationships: []
      }
      rental_payments: {
        Row: {
          id: string
          stall_rental_id: string
          company_id: string
          market_id: string
          amount: number
          payment_date: string | null
          period_month: number
          period_year: number
          payment_method: "bank_transfer" | "cash" | "check" | "stripe" | null
          status: "paid" | "pending" | "overdue"
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stall_rental_id: string
          company_id: string
          market_id: string
          amount: number
          payment_date?: string | null
          period_month: number
          period_year: number
          payment_method?: "bank_transfer" | "cash" | "check" | "stripe" | null
          status?: "paid" | "pending" | "overdue"
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stall_rental_id?: string
          company_id?: string
          market_id?: string
          amount?: number
          payment_date?: string | null
          period_month?: number
          period_year?: number
          payment_method?: "bank_transfer" | "cash" | "check" | "stripe" | null
          status?: "paid" | "pending" | "overdue"
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_stall_rental_id_fkey"
            columns: ["stall_rental_id"]
            isOneToOne: false
            referencedRelation: "stall_rentals"
            referencedColumns: ["id"]
          },
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
        ]
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          company_id: string
          rating: number
          message: string | null
          reply: string | null
          reply_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          rating: number
          message?: string | null
          reply?: string | null
          reply_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          rating?: number
          message?: string | null
          reply?: string | null
          reply_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          id: string
          user_id: string | null
          market_id: string
          full_name: string
          email: string
          phone: string | null
          position: string | null
          is_active: boolean
          market_confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          market_id: string
          full_name: string
          email: string
          phone?: string | null
          position?: string | null
          is_active?: boolean
          market_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          market_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          position?: string | null
          is_active?: boolean
          market_confirmed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string | null
          company_id: string | null
          producer_email: string
          read_at: string
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id?: string | null
          company_id?: string | null
          producer_email: string
          read_at?: string
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string | null
          company_id?: string | null
          producer_email?: string
          read_at?: string
          feedback?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_message_reads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          id: string
          created_by: string | null
          market_id: string | null
          title: string
          description: string | null
          type: "closure" | "special_opening" | "event"
          is_mandatory: boolean
          location: string
          event_date: string
          time_start: string | null
          time_end: string | null
          details: string | null
          is_published: boolean
          attachments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by?: string | null
          market_id?: string | null
          title: string
          description?: string | null
          type: "closure" | "special_opening" | "event"
          is_mandatory?: boolean
          location: string
          event_date: string
          time_start?: string | null
          time_end?: string | null
          details?: string | null
          is_published?: boolean
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string | null
          market_id?: string | null
          title?: string
          description?: string | null
          type?: "closure" | "special_opening" | "event"
          is_mandatory?: boolean
          location?: string
          event_date?: string
          time_start?: string | null
          time_end?: string | null
          details?: string | null
          is_published?: boolean
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_messages_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_rentals: {
        Row: {
          id: string
          company_id: string
          market_id: string
          stall_number: string | null
          monthly_rent: number
          rental_start_date: string
          rental_end_date: string | null
          payment_method: "bank_transfer" | "cash" | "check" | "stripe" | null
          status: "active" | "suspended" | "terminated"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          market_id: string
          stall_number?: string | null
          monthly_rent: number
          rental_start_date: string
          rental_end_date?: string | null
          payment_method?: "bank_transfer" | "cash" | "check" | "stripe" | null
          status?: "active" | "suspended" | "terminated"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          market_id?: string
          stall_number?: string | null
          monthly_rent?: number
          rental_start_date?: string
          rental_end_date?: string | null
          payment_method?: "bank_transfer" | "cash" | "check" | "stripe" | null
          status?: "active" | "suspended" | "terminated"
          created_at?: string
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
        ]
      }
      supplier_payments: {
        Row: {
          id: string
          supplier_id: string
          company_id: string
          description: string
          amount: number
          due_date: string
          status: "da_pagare" | "pagato" | "scaduto"
          payment_method: "bonifico" | "contanti" | "assegno" | "altro" | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          company_id: string
          description: string
          amount: number
          due_date: string
          status?: "da_pagare" | "pagato" | "scaduto"
          payment_method?: "bonifico" | "contanti" | "assegno" | "altro" | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          company_id?: string
          description?: string
          amount?: number
          due_date?: string
          status?: "da_pagare" | "pagato" | "scaduto"
          payment_method?: "bonifico" | "contanti" | "assegno" | "altro" | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          category: "materie_prime" | "packaging" | "attrezzature" | "servizi" | "trasporti" | "altro" | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          category?: "materie_prime" | "packaging" | "attrezzature" | "servizi" | "trasporti" | "altro" | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          category?: "materie_prime" | "packaging" | "attrezzature" | "servizi" | "trasporti" | "altro" | null
          notes?: string | null
          created_at?: string
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
        ]
      }
      tessere: {
        Row: {
          id: string
          user_id: string | null
          user_email: string
          intestatario: string | null
          market_id: string | null
          codice: string
          qr_payload: string
          tipo: "base" | "premium"
          stato: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione: string
          data_scadenza: string | null
          ultimo_utilizzo: string | null
          note: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email: string
          intestatario?: string | null
          market_id?: string | null
          codice: string
          qr_payload: string
          tipo?: "base" | "premium"
          stato?: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione?: string
          data_scadenza?: string | null
          ultimo_utilizzo?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string
          intestatario?: string | null
          market_id?: string | null
          codice?: string
          qr_payload?: string
          tipo?: "base" | "premium"
          stato?: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione?: string
          data_scadenza?: string | null
          ultimo_utilizzo?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
          id: string
          email: string | null
          role: "admin" | "client" | "producer" | "staff" | "direzione" | null
          role_confirmed: boolean
          created_at: string
          updated_at: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          email?: string | null
          role?: "admin" | "client" | "producer" | "staff" | "direzione" | null
          role_confirmed?: boolean
          created_at?: string
          updated_at?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          role?: "admin" | "client" | "producer" | "staff" | "direzione" | null
          role_confirmed?: boolean
          created_at?: string
          updated_at?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_markets_territorio: {
        Row: {
          id: string | null
          mercato: string | null
          attivo: boolean | null
          quartiere: string | null
          quartiere_id: string | null
          municipio: string | null
          comune_istat: string | null
          comune: string | null
          provincia_sigla: string | null
          provincia: string | null
          regione_istat: string | null
          regione: string | null
          ripartizione: string | null
          latitude: number | null
          longitude: number | null
        }
        Relationships: []
      }
      v_tessere_saldo: {
        Row: {
          tessera_id: string | null
          user_email: string | null
          stato: string | null
          market_id: string | null
          punti_validi: number | null
          punti_in_sospeso: number | null
          ultimo_movimento: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aziende_in_ambito: {
        Args: Record<string, unknown>   // p_livello text, p_ambito text
        Returns: Json
      }
      composizione_fatturato: {
        Args: Record<string, unknown>   // p_livello text, p_ambito text, p_dal date, p_al date, p_limite integer
        Returns: Json
      }
      mercati_in_ambito: {
        Args: Record<string, unknown>   // p_livello text, p_ambito text
        Returns: Json
      }
      metriche_operative: {
        Args: Record<string, unknown>   // p_livello text, p_ambito text, p_dal date, p_al date
        Returns: Json
      }
      puo_leggere_rete: {
        Args: Record<string, unknown>   // nessuno
        Returns: boolean
      }
      sincronizza_mercati_azienda: {
        Args: Record<string, unknown>   // p_company_id uuid, p_market_ids uuid[]
        Returns: undefined
      }
      serie_storica_fatturato: {
        Args: Record<string, unknown>   // p_livello text, p_ambito text, p_mesi integer
        Returns: Json
      }
      ddt_nazionali: {
        Args: Record<string, unknown>   // p_dal date DEFAULT NULL::date, p_al date DEFAULT NULL::date, p_regione text DEFAULT NULL::text, p_stato text DEFAULT NULL::text, p_limite integer DEFAULT 100
        Returns: Json
      }
      is_admin: {
        Args: Record<string, unknown>   // nessuno
        Returns: boolean
      }
      metriche_territorio: {
        Args: Record<string, unknown>   // p_livello text DEFAULT 'italia'::text, p_ambito text DEFAULT NULL::text, p_dal date DEFAULT NULL::date, p_al date DEFAULT NULL::date
        Returns: Json
      }
      next_ddt_number: {
        Args: Record<string, unknown>   // p_company_id uuid, p_year integer
        Returns: number
      }
      owns_company: {
        Args: Record<string, unknown>   // p_company_id uuid
        Returns: boolean
      }
      riepilogo_nazionale: {
        Args: Record<string, unknown>   // p_dal date DEFAULT NULL::date, p_al date DEFAULT NULL::date
        Returns: Json
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Scorciatoie d'uso:
//   type Product = Tables<'products'>
//   type NewProduct = TablesInsert<'products'>
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

