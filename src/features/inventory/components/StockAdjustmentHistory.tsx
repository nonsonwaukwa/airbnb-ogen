import React from 'react';
import { useGetStockAdjustmentHistory } from '../hooks/useStockAdjustments';
import type { StockAdjustmentHistoryRecord } from '../hooks/useStockAdjustments'; // Import type
import type { InventoryItem } from '../types'; // Import InventoryItem type
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// Helper Functions (can be shared in utils)
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'PP p'); // Format with date and time
  } catch { return 'Invalid Date'; }
};

const getStatusVariant = (isLow: boolean): "destructive" | "secondary" => {
  return isLow ? 'destructive' : 'secondary';
};
const getStatusText = (isLow: boolean): string => {
  return isLow ? 'Low Stock' : 'In Stock';
};

interface StockAdjustmentHistoryProps {
  item: InventoryItem | null; // Pass the full item object for current status
}

export function StockAdjustmentHistory({ item }: StockAdjustmentHistoryProps) {
  // Fetch history based on item and property ID from the passed item object
  const {
    data: history = [],
    isLoading: isLoadingHistory,
    error: historyError
  } = useGetStockAdjustmentHistory(item?.item_catalog_id, item?.property_id);

  if (!item) {
    return <div className="p-4 text-center text-muted-foreground">Select an item row to view history.</div>;
  }

  // Determine current stock status
  const lowStockThreshold = item.item_catalog?.low_stock_threshold ?? 0;
  const isLowStock = item.current_quantity <= lowStockThreshold;

  return (
    <div className="flex flex-col h-[70vh]"> {/* Set height for dialog content */}
      {/* Current Status Summary */}
      <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 rounded-t-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Property/Location</div>
            <div className="font-medium">{item.property?.name ?? 'General/Warehouse'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Current Quantity</div>
            <div className="font-medium">{item.current_quantity} {item.item_catalog?.unit_of_measure || ''}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Low Stock Threshold</div>
            <div className="font-medium">{lowStockThreshold}</div>
          </div>
           <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant={getStatusVariant(isLowStock)} className="capitalize mt-1">
                {getStatusText(isLowStock)}
            </Badge>
          </div>
        </div>
      </div>

      {/* History Table */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h4 className="font-semibold mb-3">Adjustment History</h4>
          {isLoadingHistory ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : historyError ? (
            <p className="text-destructive text-sm">Error loading history: {historyError.message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length > 0 ? (
                  history.map((adj: StockAdjustmentHistoryRecord) => (
                    <TableRow key={adj.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(adj.created_at)}</TableCell>
                      <TableCell>{adj.adjustment_type}</TableCell>
                      <TableCell className={`text-right font-medium ${adj.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                      </TableCell>
                      <TableCell>{adj.profile?.full_name ?? 'Unknown User'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{adj.notes}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No adjustment history found for this item at this location.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
