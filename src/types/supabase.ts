export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      booking_images: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          image_url: string
          order: number
          uploaded_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          image_url: string
          order?: number
          uploaded_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          image_url?: string
          order?: number
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_images_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number
          booking_number: string
          booking_status: string
          checkin_datetime: string
          checkout_datetime: string
          created_at: string | null
          created_by_user_id: string | null
          currency: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          number_of_guests: number
          payment_method: string | null
          payment_status: string | null
          platform: string | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_number?: string
          booking_status?: string
          checkin_datetime: string
          checkout_datetime: string
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          number_of_guests?: number
          payment_method?: string | null
          payment_status?: string | null
          platform?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_number?: string
          booking_status?: string
          checkin_datetime?: string
          checkout_datetime?: string
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          number_of_guests?: number
          payment_method?: string | null
          payment_status?: string | null
          platform?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          current_quantity: number
          id: string
          item_catalog_id: string
          last_updated_at: string | null
          property_id: string | null
        }
        Insert: {
          current_quantity?: number
          id?: string
          item_catalog_id: string
          last_updated_at?: string | null
          property_id?: string | null
        }
        Update: {
          current_quantity?: number
          id?: string
          item_catalog_id?: string
          last_updated_at?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_item_catalog_id_fkey"
            columns: ["item_catalog_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          booking_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency: string
          customer_address_city: string | null
          customer_address_country: string | null
          customer_address_postal_code: string | null
          customer_address_state: string | null
          customer_address_street: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
          subtotal_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          booking_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          customer_address_city?: string | null
          customer_address_country?: string | null
          customer_address_postal_code?: string | null
          customer_address_state?: string | null
          customer_address_street?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          booking_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          customer_address_city?: string | null
          customer_address_country?: string | null
          customer_address_postal_code?: string | null
          customer_address_state?: string | null
          customer_address_street?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          subtotal_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          preferred_supplier_id: string | null
          reorder_quantity: number
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          preferred_supplier_id?: string | null
          reorder_quantity?: number
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          preferred_supplier_id?: string | null
          reorder_quantity?: number
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_catalog_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          description: string | null
          id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          employment_date: string | null
          full_name: string
          id: string
          phone: string | null
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          employment_date?: string | null
          full_name: string
          id: string
          phone?: string | null
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          employment_date?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_city: string | null
          address_lga: string | null
          address_state: string | null
          address_street: string | null
          amenities: string[] | null
          base_rate_amount: number | null
          base_rate_currency: string | null
          base_rate_per: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          name: string
          notes: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_lga?: string | null
          address_state?: string | null
          address_street?: string | null
          amenities?: string[] | null
          base_rate_amount?: number | null
          base_rate_currency?: string | null
          base_rate_per?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_lga?: string | null
          address_state?: string | null
          address_street?: string | null
          amenities?: string[] | null
          base_rate_amount?: number | null
          base_rate_currency?: string | null
          base_rate_per?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_images: {
        Row: {
          id: string
          image_url: string
          order: number | null
          property_id: string
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          image_url: string
          order?: number | null
          property_id: string
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          image_url?: string
          order?: number | null
          property_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string | null
          currency: string | null
          date: string
          id: string
          item_catalog_id: string
          notes: string | null
          property_id: string | null
          quantity_change: number
          related_procurement_id: string | null
          related_sale_id: string | null
          staff_id: string
          unit_price: number | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          item_catalog_id: string
          notes?: string | null
          property_id?: string | null
          quantity_change: number
          related_procurement_id?: string | null
          related_sale_id?: string | null
          staff_id: string
          unit_price?: number | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string | null
          currency?: string | null
          date?: string
          id?: string
          item_catalog_id?: string
          notes?: string | null
          property_id?: string | null
          quantity_change?: number
          related_procurement_id?: string | null
          related_sale_id?: string | null
          staff_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_item_catalog_id_fkey"
            columns: ["item_catalog_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address_city: string | null
          address_lga: string | null
          address_state: string | null
          address_street: string | null
          category: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_lga?: string | null
          address_state?: string | null
          address_street?: string | null
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_lga?: string | null
          address_state?: string | null
          address_street?: string | null
          category?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: number | null
          bank_name: string | null
          company_address: string
          company_email: string
          company_logo_url: string | null
          company_name: string
          company_phone: number | null
          id: number
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: number | null
          bank_name?: string | null
          company_address: string
          company_email: string
          company_logo_url?: string | null
          company_name: string
          company_phone?: number | null
          id: number
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: number | null
          bank_name?: string | null
          company_address?: string
          company_email?: string
          company_logo_url?: string | null
          company_name?: string
          company_phone?: number | null
          id?: number
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_permission: {
        Args: { permission_id_to_check: string }
        Returns: boolean
      }
      create_role_and_permissions: {
        Args: {
          p_role_name: string
          p_role_description: string
          p_permission_ids: string[]
        }
        Returns: string
      }
      generate_pending_po: {
        Args: { p_item_id: string; p_property_id: string }
        Returns: string
      }
      get_user_auth_details: {
        Args: { p_user_id: string }
        Returns: Json
      }
      update_invoice_total_and_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      update_role_and_permissions: {
        Args: {
          p_role_id: string
          p_role_name: string
          p_role_description: string
          p_permission_ids: string[]
        }
        Returns: undefined
      }
      user_has_permission: {
        Args: { p_user_id: string; p_permission_id: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
