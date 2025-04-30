import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// Assuming the form is correctly imported
import { CatalogItemForm } from '../components/CatalogItemForm';
// Assuming the types and hooks are correctly imported and updated
import { useGetCatalogItems, useCreateCatalogItem } from '../hooks/useItemCatalog';
import type { CatalogItem } from '../types'; // Import CatalogItem from types index
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Assuming this component handles editing via a dialog
import { EditItemCatalogDialog } from '../components/EditItemCatalogDialog';
import { formatCurrency } from '@/lib/utils'; // Assuming a currency formatting utility

export function ItemCatalogPage() {
  const { permissions, loading: authLoading } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // Ensure useGetCatalogItems fetches the new fields (select('*') should do this)
  const { data: catalogItems, isLoading } = useGetCatalogItems();
  const createCatalogItem = useCreateCatalogItem();
  // Removed unused editingItem state, assuming EditItemCatalogDialog handles its own state or uses selectedItem
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Helper to safely format currency
  const displayPrice = (price: number | null, currency: string | null) => {
    if (price === null || price === undefined) return '-';
    // Use a utility function or Intl.NumberFormat for proper formatting
    return formatCurrency(price, currency ?? undefined); // Pass undefined if currency is null
  };

  if (!authLoading && !permissions?.view_catalog) { // Assuming 'view_catalog' permission exists
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the item catalog.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Note: Columns definition removed as actions are handled directly in the map below

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Item Catalog</h2>
          <p className="text-muted-foreground">Manage your inventory item catalog.</p>
        </div>
        {/* Assuming 'manage_catalog' or 'add_inventory' permission for adding */}
        {permissions?.add_inventory && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {isLoading ? (
        <div>Loading catalog items...</div> // Replace with Skeleton loader if preferred
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Last Price</TableHead> {/* Added */}
                <TableHead className="text-right">Low Stock</TableHead>
                <TableHead className="text-right">Reorder Qty</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogItems?.length ? (
                catalogItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description ?? '-'}</TableCell>
                    <TableCell>{item.unit_of_measure}</TableCell>
                    <TableCell className="text-right">
                      {/* Display formatted price and currency */}
                      {displayPrice(item.last_purchase_price, item.currency)}
                    </TableCell>
                    <TableCell className="text-right">{item.low_stock_threshold}</TableCell>
                    <TableCell className="text-right">{item.reorder_quantity}</TableCell>
                    <TableCell className="text-center">
                      {/* Assuming 'edit_inventory' permission for editing catalog items */}
                      {permissions?.edit_inventory && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item);
                            setEditDialogOpen(true);
                          }}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  {/* Adjusted colSpan for the new number of columns */}
                  <TableCell colSpan={7} className="h-24 text-center">
                    No items in catalog.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Item Dialog */}
      {/* Assuming 'add_inventory' permission */}
      {permissions?.add_inventory && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Catalog Item</DialogTitle>
              <DialogDescription>
                Enter the details for the new catalog item.
              </DialogDescription>
            </DialogHeader>
            <CatalogItemForm
              // Ensure the form submit calls the correct mutation
              onSubmit={async (data) => {
                // The data from the form should match CreateCatalogItemDTO
                await createCatalogItem.mutateAsync(data);
                setIsAddDialogOpen(false); // Close dialog on success
              }}
              isSubmitting={createCatalogItem.isPending}
              onCancel={() => setIsAddDialogOpen(false)} // Add cancel handler
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Item Dialog */}
      {selectedItem && permissions?.edit_inventory && (
        <EditItemCatalogDialog // Assuming this component exists and handles the update
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={selectedItem}
        />
      )}
    </div>
  );
}
