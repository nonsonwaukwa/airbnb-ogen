import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import Description
} from '@/components/ui/dialog';
import { useGetInventoryItems } from '../hooks/useInventory';
import { StockAdjustmentHistory } from './StockAdjustmentHistory'; // Import the new component
import type { InventoryItem } from '../types'; // Import InventoryItem type

// Helper function for status badge
const getStatusVariant = (isLow: boolean): "destructive" | "secondary" => {
  return isLow ? 'destructive' : 'secondary';
};
const getStatusText = (isLow: boolean): string => {
  return isLow ? 'Low Stock' : 'In Stock';
};


export function InventoryStatusTable() {
  const { data: inventoryItems = [], isLoading } = useGetInventoryItems(); // Default to empty array

  // State now holds the full InventoryItem object or null
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);

  const sortedItems = useMemo(() => {
    // Ensure inventoryItems is always an array before sorting
    const items = inventoryItems ?? [];
    return [...items].sort((a, b) => {
      const aThreshold = a.item_catalog?.low_stock_threshold ?? 0;
      const bThreshold = b.item_catalog?.low_stock_threshold ?? 0;
      const aIsLow = a.current_quantity <= aThreshold;
      const bIsLow = b.current_quantity <= bThreshold;
      if (aIsLow !== bIsLow) return aIsLow ? -1 : 1;
      return (a.item_catalog?.name ?? '').localeCompare(b.item_catalog?.name ?? '');
    });
  }, [inventoryItems]);

  if (isLoading) {
    return <div>Loading inventory status...</div>; // Add Skeleton later
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">Current Qty</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead> {/* Align Actions Right */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length > 0 ? sortedItems.map((item) => {
              const lowStockThreshold = item.item_catalog?.low_stock_threshold ?? 0;
              const isLowStock = item.current_quantity <= lowStockThreshold;

              return (
                <TableRow key={`${item.item_catalog_id}-${item.property_id}`}>
                  <TableCell className="font-medium">{item.item_catalog?.name ?? 'Unknown Item'}</TableCell>
                  <TableCell>{item.property?.name ?? 'General'}</TableCell>
                  <TableCell className="text-right">{item.current_quantity}</TableCell>
                  <TableCell className="text-right">{lowStockThreshold}</TableCell>
                  <TableCell>{item.item_catalog?.unit_of_measure ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(isLowStock)} className="capitalize">
                      {getStatusText(isLowStock)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right"> {/* Align Cell Right */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItemHistory(item)} // Set the full item object
                      title="View History" // Add tooltip
                    >
                      <History className="h-4 w-4" />
                      <span className="sr-only">View History</span> {/* For accessibility */}
                    </Button>
                    {/* Add Adjust button here if moving form to modal */}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24"> {/* Adjusted colSpan */}
                  No inventory items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* History Dialog */}
      <Dialog open={!!selectedItemHistory} onOpenChange={() => setSelectedItemHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col"> {/* Adjust size and make flex */}
          <DialogHeader>
            {/* Use selected item name in title */}
            <DialogTitle>Stock Adjustment History: {selectedItemHistory?.item_catalog?.name ?? 'Item'}</DialogTitle>
            {/* Add Description for Accessibility */}
            <DialogDescription>
                View the history of stock changes for this item at the specified location.
            </DialogDescription>
          </DialogHeader>
          {/* Render history component, passing the selected item */}
          <StockAdjustmentHistory item={selectedItemHistory} />
        </DialogContent>
      </Dialog>
    </>
  );
}

 
 