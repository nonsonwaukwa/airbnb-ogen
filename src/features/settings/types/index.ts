// Defines the structure for system-wide settings, likely stored in a single row 
// or as key-value pairs in the database (e.g., in a 'system_settings' table).

export interface SystemSettings {
    // Assuming settings are stored in a single row, 'id' might be a fixed value (e.g., 1 or a UUID)
    id?: number | string; // Optional, depending on storage strategy

    // Company Information
    company_name?: string | null;
    company_address?: string | null; // Could be broken down further if needed (street, city, etc.)
    company_logo_url?: string | null; // URL to the logo (storage handled separately)
    company_email?: string | null;
    company_phone?: string | null;

    // Financial Information (for Invoices)
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    // Add other relevant settings like default currency, tax rate etc. if needed later
    default_currency?: string | null;
    default_tax_rate?: number | null; // e.g., 0.075 for 7.5%

    // Timestamps (if stored in a table row)
    updated_at?: string | null;
}

// Payload for updating settings
export type UpdateSystemSettingsPayload = Omit<SystemSettings, 'id' | 'updated_at'>; 