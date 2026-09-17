// GENERATO AUTOMATICAMENTE — non modificare a mano.
// Rigenerare con: npm run gen:types

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      admin_whitelist: {
        Row: {
          email: string
          livello: "nazionale" | "regionale" | "provinciale"
          ambito: string | null
          note: string | null
          attivo: boolean
          created_date: string
          created_by: string | null
        }
        Insert: {
          email: string
          livello?: "nazionale" | "regionale" | "provinciale"
          ambito?: string | null
          note?: string | null
          attivo?: boolean
          created_date?: string
          created_by?: string | null
        }
        Update: {
          email?: string
          livello?: "nazionale" | "regionale" | "provinciale"
          ambito?: string | null
          note?: string | null
          attivo?: boolean
          created_date?: string
          created_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
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
          partita_iva: string | null
          codice_fiscale: string | null
          ragione_sociale: string | null
          sede_indirizzo: string | null
          sede_comune_istat: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
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
          partita_iva?: string | null
          codice_fiscale?: string | null
          ragione_sociale?: string | null
          sede_indirizzo?: string | null
          sede_comune_istat?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
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
          partita_iva?: string | null
          codice_fiscale?: string | null
          ragione_sociale?: string | null
          sede_indirizzo?: string | null
          sede_comune_istat?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_sede_comune_istat_fkey"
            columns: ["sede_comune_istat"]
            isOneToOne: false
            referencedRelation: "comuni"
            referencedColumns: ["codice_istat"]
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
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          market_event_id: string
          assigned_product_ids?: string[]
          stand_number?: string | null
          status?: "pending" | "confirmed" | "completed" | "cancelled"
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          market_event_id?: string
          assigned_product_ids?: string[]
          stand_number?: string | null
          status?: "pending" | "confirmed" | "completed" | "cancelled"
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
      company_needs: {
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
          created_date: string
          updated_date: string
          created_by: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
      ddt: {
        Row: {
          id: string
          numero: number | null
          anno: number | null
          numero_completo: string | null
          data_documento: string
          company_id: string
          mittente_ragione_sociale: string
          mittente_partita_iva: string | null
          mittente_codice_fiscale: string | null
          mittente_indirizzo: string | null
          destinatario_tipo: "mercato" | "cliente" | "altro"
          market_id: string | null
          destinatario_denominazione: string
          destinatario_indirizzo: string | null
          destinatario_partita_iva: string | null
          luogo_destinazione: string | null
          causale: "vendita" | "conto_visione" | "conto_deposito" | "reso" | "trasferimento" | "omaggio" | "riparazione" | "altro"
          causale_altro: string | null
          trasporto_a_cura_di: "mittente" | "destinatario" | "vettore"
          vettore_denominazione: string | null
          vettore_partita_iva: string | null
          data_ora_ritiro: string | null
          aspetto_beni: string | null
          numero_colli: number | null
          peso_kg: number | null
          stato: "bozza" | "emesso" | "consegnato" | "annullato"
          data_emissione: string | null
          data_consegna: string | null
          data_annullamento: string | null
          motivo_annullamento: string | null
          firma_ricezione_url: string | null
          firmato_da: string | null
          pdf_url: string | null
          note: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          numero?: number | null
          anno?: number | null
          data_documento?: string
          company_id: string
          mittente_ragione_sociale: string
          mittente_partita_iva?: string | null
          mittente_codice_fiscale?: string | null
          mittente_indirizzo?: string | null
          destinatario_tipo?: "mercato" | "cliente" | "altro"
          market_id?: string | null
          destinatario_denominazione: string
          destinatario_indirizzo?: string | null
          destinatario_partita_iva?: string | null
          luogo_destinazione?: string | null
          causale?: "vendita" | "conto_visione" | "conto_deposito" | "reso" | "trasferimento" | "omaggio" | "riparazione" | "altro"
          causale_altro?: string | null
          trasporto_a_cura_di?: "mittente" | "destinatario" | "vettore"
          vettore_denominazione?: string | null
          vettore_partita_iva?: string | null
          data_ora_ritiro?: string | null
          aspetto_beni?: string | null
          numero_colli?: number | null
          peso_kg?: number | null
          stato?: "bozza" | "emesso" | "consegnato" | "annullato"
          data_emissione?: string | null
          data_consegna?: string | null
          data_annullamento?: string | null
          motivo_annullamento?: string | null
          firma_ricezione_url?: string | null
          firmato_da?: string | null
          pdf_url?: string | null
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          numero?: number | null
          anno?: number | null
          data_documento?: string
          company_id?: string
          mittente_ragione_sociale?: string
          mittente_partita_iva?: string | null
          mittente_codice_fiscale?: string | null
          mittente_indirizzo?: string | null
          destinatario_tipo?: "mercato" | "cliente" | "altro"
          market_id?: string | null
          destinatario_denominazione?: string
          destinatario_indirizzo?: string | null
          destinatario_partita_iva?: string | null
          luogo_destinazione?: string | null
          causale?: "vendita" | "conto_visione" | "conto_deposito" | "reso" | "trasferimento" | "omaggio" | "riparazione" | "altro"
          causale_altro?: string | null
          trasporto_a_cura_di?: "mittente" | "destinatario" | "vettore"
          vettore_denominazione?: string | null
          vettore_partita_iva?: string | null
          data_ora_ritiro?: string | null
          aspetto_beni?: string | null
          numero_colli?: number | null
          peso_kg?: number | null
          stato?: "bozza" | "emesso" | "consegnato" | "annullato"
          data_emissione?: string | null
          data_consegna?: string | null
          data_annullamento?: string | null
          motivo_annullamento?: string | null
          firma_ricezione_url?: string | null
          firmato_da?: string | null
          pdf_url?: string | null
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ddt_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      ddt_counters: {
        Row: {
          company_id: string
          anno: number
          ultimo_numero: number
        }
        Insert: {
          company_id: string
          anno: number
          ultimo_numero?: number
        }
        Update: {
          company_id?: string
          anno?: number
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "ddt_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ddt_righe: {
        Row: {
          id: string
          ddt_id: string
          riga_numero: number
          product_id: string | null
          descrizione: string
          quantita: number
          unita: string
          prezzo_unitario: number | null
          importo: number | null
          lotto: string | null
          note: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          ddt_id: string
          riga_numero: number
          product_id?: string | null
          descrizione: string
          quantita: number
          unita?: string
          prezzo_unitario?: number | null
          lotto?: string | null
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          ddt_id?: string
          riga_numero?: number
          product_id?: string | null
          descrizione?: string
          quantita?: number
          unita?: string
          prezzo_unitario?: number | null
          lotto?: string | null
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ddt_righe_ddt_id_fkey"
            columns: ["ddt_id"]
            isOneToOne: false
            referencedRelation: "ddt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          id: string
          company_id: string | null
          market_id: string | null
          product_id: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          market_id?: string | null
          product_id?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          market_id?: string | null
          product_id?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          id: string
          market_id: string
          event_date: string
          time_start: string | null
          time_end: string | null
          title: string | null
          capacity: number | null
          registered_company_ids: string[]
          created_date: string
          updated_date: string
          created_by: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          comune_istat: string | null
          quartiere_id: string | null
          codice_mercato: string | null
          attivo: boolean
          created_date: string
          updated_date: string
          created_by: string | null
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
          comune_istat?: string | null
          quartiere_id?: string | null
          codice_mercato?: string | null
          attivo?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          comune_istat?: string | null
          quartiere_id?: string | null
          codice_mercato?: string | null
          attivo?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date?: string | null
          url?: string | null
          source: string
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string | null
          url?: string | null
          source?: string
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_email: string
          title: string
          message: string | null
          type: "new_product" | "order_update" | "generic"
          company_id: string | null
          product_id: string | null
          order_id: string | null
          message_id: string | null
          read: boolean
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_email: string
          title: string
          message?: string | null
          type?: "new_product" | "order_update" | "generic"
          company_id?: string | null
          product_id?: string | null
          order_id?: string | null
          message_id?: string | null
          read?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          user_email?: string
          title?: string
          message?: string | null
          type?: "new_product" | "order_update" | "generic"
          company_id?: string | null
          product_id?: string | null
          order_id?: string | null
          message_id?: string | null
          read?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          company_id: string
          company_name: string | null
          market_id: string
          market_name: string | null
          items: Json
          total_amount: number | null
          status: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date: string | null
          notes: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          company_name?: string | null
          market_id: string
          market_name?: string | null
          items?: Json
          total_amount?: number | null
          status?: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date?: string | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          company_name?: string | null
          market_id?: string
          market_name?: string | null
          items?: Json
          total_amount?: number | null
          status?: "in_attesa" | "confermato" | "pronto" | "ritirato" | "annullato"
          pickup_date?: string | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
        ]
      }
      producer_event_rsvps: {
        Row: {
          id: string
          message_id: string
          company_id: string
          producer_email: string
          market_id: string
          status: "pending" | "accepted" | "declined"
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          message_id: string
          company_id: string
          producer_email: string
          market_id: string
          status?: "pending" | "accepted" | "declined"
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          company_id?: string
          producer_email?: string
          market_id?: string
          status?: "pending" | "accepted" | "declined"
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
            foreignKeyName: "producer_event_rsvps_market_id_fkey"
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
          product_id: string | null
          name: string | null
          quantity: number
          min_threshold: number | null
          notes: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          product_id?: string | null
          name?: string | null
          quantity?: number
          min_threshold?: number | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string | null
          name?: string | null
          quantity?: number
          min_threshold?: number | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          unit: "kg" | "lt" | "pz" | "confezione" | null
          image_url: string | null
          category: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          company_id: string
          available: boolean
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          unit?: "kg" | "lt" | "pz" | "confezione" | null
          image_url?: string | null
          category?: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          company_id: string
          available?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          unit?: "kg" | "lt" | "pz" | "confezione" | null
          image_url?: string | null
          category?: "frutta" | "verdura" | "formaggi" | "salumi" | "olio" | "vino" | "miele" | "pane_pasta" | "conserve" | "altro" | null
          company_id?: string
          available?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: "admin" | "client" | "producer" | "staff"
          role_confirmed: boolean
          phone: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "client" | "producer" | "staff"
          role_confirmed?: boolean
          phone?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "admin" | "client" | "producer" | "staff"
          role_confirmed?: boolean
          phone?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "users"
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
          ripartizione: string | null
        }
        Insert: {
          codice_istat: string
          nome: string
          ripartizione?: string | null
        }
        Update: {
          codice_istat?: string
          nome?: string
          ripartizione?: string | null
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
          created_date: string
          updated_date: string
          created_by: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          company_id: string
          rating: number
          message: string | null
          reply: string | null
          reply_date: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          rating: number
          message?: string | null
          reply?: string | null
          reply_date?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          rating?: number
          message?: string | null
          reply?: string | null
          reply_date?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
      staff_members: {
        Row: {
          id: string
          market_id: string
          full_name: string
          email: string
          phone: string | null
          position: string | null
          is_active: boolean
          market_confirmed: boolean
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          market_id: string
          full_name: string
          email: string
          phone?: string | null
          position?: string | null
          is_active?: boolean
          market_confirmed?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          market_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          position?: string | null
          is_active?: boolean
          market_confirmed?: boolean
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
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
          producer_email: string
          company_id: string | null
          read_at: string | null
          feedback: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          message_id: string
          producer_email: string
          company_id?: string | null
          read_at?: string | null
          feedback?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          producer_email?: string
          company_id?: string | null
          read_at?: string | null
          feedback?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          title: string
          description: string | null
          type: "closure" | "special_opening" | "event"
          is_mandatory: boolean
          market_id: string | null
          location: string
          event_date: string
          time_start: string | null
          time_end: string | null
          details: string | null
          is_published: boolean
          attachments: Json
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: "closure" | "special_opening" | "event"
          is_mandatory?: boolean
          market_id?: string | null
          location: string
          event_date: string
          time_start?: string | null
          time_end?: string | null
          details?: string | null
          is_published?: boolean
          attachments?: Json
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: "closure" | "special_opening" | "event"
          is_mandatory?: boolean
          market_id?: string | null
          location?: string
          event_date?: string
          time_start?: string | null
          time_end?: string | null
          details?: string | null
          is_published?: boolean
          attachments?: Json
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
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
          monthly_rent: number | null
          rental_start_date: string | null
          rental_end_date: string | null
          payment_method: string | null
          status: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          market_id: string
          stall_number?: string | null
          monthly_rent?: number | null
          rental_start_date?: string | null
          rental_end_date?: string | null
          payment_method?: string | null
          status?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          market_id?: string
          stall_number?: string | null
          monthly_rent?: number | null
          rental_start_date?: string | null
          rental_end_date?: string | null
          payment_method?: string | null
          status?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date: string
          updated_date: string
          created_by: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
          category: string | null
          contact_name: string | null
          email: string | null
          phone: string | null
          description: string | null
          notes: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          category?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          description?: string | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          category?: string | null
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          description?: string | null
          notes?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
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
      tessera_utilizzi: {
        Row: {
          id: string
          tessera_id: string
          market_id: string | null
          company_id: string | null
          order_id: string | null
          tipo_evento: "scansione" | "ordine" | "sconto" | "altro"
          importo: number | null
          note: string | null
          created_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tessera_id: string
          market_id?: string | null
          company_id?: string | null
          order_id?: string | null
          tipo_evento?: "scansione" | "ordine" | "sconto" | "altro"
          importo?: number | null
          note?: string | null
          created_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tessera_id?: string
          market_id?: string | null
          company_id?: string | null
          order_id?: string | null
          tipo_evento?: "scansione" | "ordine" | "sconto" | "altro"
          importo?: number | null
          note?: string | null
          created_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tessera_utilizzi_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "tessere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessera_utilizzi_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessera_utilizzi_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessera_utilizzi_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tessere: {
        Row: {
          id: string
          codice: string
          user_id: string | null
          user_email: string
          intestatario: string | null
          market_id: string | null
          tipo: "base" | "premium"
          stato: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione: string
          data_scadenza: string | null
          ultimo_utilizzo: string | null
          qr_payload: string
          note: string | null
          created_date: string
          updated_date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          codice: string
          user_id?: string | null
          user_email: string
          intestatario?: string | null
          market_id?: string | null
          tipo?: "base" | "premium"
          stato?: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione?: string
          data_scadenza?: string | null
          ultimo_utilizzo?: string | null
          qr_payload: string
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          codice?: string
          user_id?: string | null
          user_email?: string
          intestatario?: string | null
          market_id?: string | null
          tipo?: "base" | "premium"
          stato?: "attiva" | "sospesa" | "scaduta" | "revocata"
          data_emissione?: string
          data_scadenza?: string | null
          ultimo_utilizzo?: string | null
          qr_payload?: string
          note?: string | null
          created_date?: string
          updated_date?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tessere_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tessere_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ddt_totali: {
        Row: {
          ddt_id: string | null
          righe: number | null
          quantita_totale: number | null
          importo_totale: number | null
        }
        Relationships: []
      }
      v_markets_territorio: {
        Row: {
          id: string | null
          name: string | null
          city: string | null
          attivo: boolean | null
          quartiere: string | null
          comune: string | null
          comune_istat: string | null
          provincia: string | null
          provincia_sigla: string | null
          regione: string | null
          regione_istat: string | null
          ripartizione: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      emetti_ddt: {
        Args: Record<string, unknown>   // p_ddt_id uuid
        Returns: Json
      }
      genera_codice_tessera: {
        Args: Record<string, unknown>   // nessuno
        Returns: string
      }
      is_admin: {
        Args: Record<string, unknown>   // nessuno
        Returns: boolean
      }
      is_staff_of_market: {
        Args: Record<string, unknown>   // p_market_id uuid
        Returns: boolean
      }
      my_markets: {
        Args: Record<string, unknown>   // nessuno
        Returns: Json
      }
      next_ddt_number: {
        Args: Record<string, unknown>   // p_company_id uuid, p_anno integer
        Returns: number
      }
      owns_company: {
        Args: Record<string, unknown>   // p_company_id uuid
        Returns: boolean
      }
      sincronizza_mercati_azienda: {
        Args: Record<string, unknown>   // p_company_id uuid, p_market_ids uuid[]
        Returns: Json
      }
      user_role: {
        Args: Record<string, unknown>   // nessuno
        Returns: string
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

