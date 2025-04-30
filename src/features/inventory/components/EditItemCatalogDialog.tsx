import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useUpdateCatalogItem } from '../hooks/useItemCatalog';
import type { CatalogItem, CreateCatalogItemDTO } from '../types'; // Import correct types
import { CatalogItemForm } from './CatalogItemForm'; // Import the reusable form

// Keep the schema consistent with CatalogItemForm if needed, or rely on CatalogItemForm's schema
// If CatalogItemForm handles validation, this might not be needed here.
// For simplicity, assuming CatalogItemForm handles its own validation via props.

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem; // Use the full CatalogItem type
}

export function EditItemCatalogDialog({ open, onOpenChange, item }: Props) {
  const updateItem = useUpdateCatalogItem();

  const handleSubmit = async (data: CreateCatalogItemDTO) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        ...data, // Spread the form data directly
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error('Failed to update item:', error);
      // Error handling (e.g., toast notification) is handled by useUpdateItemCatalog hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Add max height and overflow-y-auto for scrollability */}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item: {item.name}</DialogTitle>
          <DialogDescription>
            Update the details for this catalog item.
          </DialogDescription>
        </DialogHeader>

        {/* Use the reusable form component */}
        <CatalogItemForm
          onSubmit={handleSubmit}
          defaultValues={item} // Pass the full item as default values
          isSubmitting={updateItem.isPending}
          onCancel={() => onOpenChange(false)} // Add cancel handler
        />

      </DialogContent>
    </Dialog>
  );
}


 
 