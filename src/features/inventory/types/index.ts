import { Database } from '@/types/supabase';

// Updated CatalogItem interface
export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_of_measure: string;
  low_stock_threshold: number;
  preferred_supplier_id: string | null;
  reorder_quantity: number;
  last_purchase_price: number | null; // Added
  currency: string | null; // Added
  created_at: string;
  updated_at: string;
}

// InventoryItem remains the same for now, but joins might pull new fields later
export interface InventoryItem {
  id: string;
  item_catalog_id: string;
  property_id: string | null;
  current_quantity: number;
  last_updated_at: string;
  item_catalog: Pick<CatalogItem, 'id' | 'name' | 'description' | 'category' | 'unit_of_measure' | 'low_stock_threshold'>;
  property?: { name: string } | null;
}

// StockAdjustment remains the same
export type StockAdjustment = Database['public']['Tables']['stock_adjustments']['Row'] & {
  item_catalog: Pick<CatalogItem, 'name' | 'unit_of_measure'>;
  property?: { name: string } | null;
  staff: { full_name: string };
};

// Updated DTOs
export type CreateCatalogItemDTO = Omit<CatalogItem, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCatalogItemDTO = Partial<CreateCatalogItemDTO>;

export type CreateStockAdjustmentDTO = Omit<
  Database['public']['Tables']['stock_adjustments']['Row'],
  'id' | 'created_at' | 'staff_id'
>;

// Enums remain the same
export const AdjustmentTypes = {
  MANUAL_ADD: 'Manual Add',
  MANUAL_REMOVE: 'Manual Remove',
  PROCUREMENT_RECEIVED: 'Procurement Received',
  SALE: 'Sale',
  DAMAGE: 'Damage',
  INITIAL_STOCK: 'Initial Stock',
} as const;

export type AdjustmentType = typeof AdjustmentTypes[keyof typeof AdjustmentTypes];
