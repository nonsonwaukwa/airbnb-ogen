import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useReceiveProcurementOrderItems } from '../hooks/useProcurement';
import type { ProcurementOrder, ProcurementLineItem } from '../hooks/useProcurement';

// Schema for a single line item's received quantity
const lineItemSchema = z.object({
  lineItemId: z.string(),
  quantityOrdered: z.number(), // Keep track for display/input max
  quantityReceived: z.number({
      coerce: true,
      invalid_type_error: 'Must be a number',
    })
    .min(0, 'Cannot be negative')
    // Removed refine comparing received to ordered here
});

// Schema for the whole form
const formSchema = z.object({
  lineItems: z.array(lineItemSchema)
    // Removed refine comparing received vs ordered across items
});

type FormValues = z.infer<typeof formSchema>;

interface ReceiveOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProcurementOrder & { lineItems: ProcurementLineItem[] }; // Ensure order includes lineItems
}

export function ReceiveOrderDialog({ open, onOpenChange, order }: ReceiveOrderDialogProps) {
  const receiveItemsMutation = useReceiveProcurementOrderItems();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lineItems: order.lineItems.map(item => ({
        lineItemId: item.id,
        quantityOrdered: item.quantity_ordered,
        // Default received quantity to the remaining amount
        quantityReceived: Math.max(0, item.quantity_ordered - (item.quantity_received || 0)),
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await receiveItemsMutation.mutateAsync({
        orderId: order.id,
        // Filter data slightly if needed, e.g., only send items with received > 0
        receivedItems: data.lineItems.map(item => ({
          lineItemId: item.lineItemId,
          quantityReceived: item.quantityReceived,
        })),
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      // Error already handled by the hook's onError with toast
      console.error("Receive items submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Receive Items for PO #{order.order_number}</DialogTitle>
          <DialogDescription>
Enter the quantity received for each line item.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
            {/* Make the table scrollable */}
            <ScrollArea className="flex-grow pr-6 -mr-6 border-b">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty Ordered</TableHead>
                    <TableHead className="text-right">Qty Already Received</TableHead>
                    <TableHead className="w-[150px] text-right">Qty Received Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    // Find the original line item data for display
                    const originalItem = order.lineItems.find(li => li.id === field.lineItemId);
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{originalItem?.item_catalog?.name ?? 'Unknown Item'}</TableCell>
                        <TableCell className="text-right">{originalItem?.quantity_ordered ?? 0} {originalItem?.item_catalog?.unit_of_measure ?? ''}</TableCell>
                        <TableCell className="text-right">{originalItem?.quantity_received ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantityReceived`}
                            render={({ field: formField }) => (
                              <FormItem>
                                {/* Hide label for table layout */}
                                {/* <FormLabel className="sr-only">Qty Received Now</FormLabel> */}
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={originalItem?.quantity_ordered ?? undefined} // Set max based on ordered
                                    placeholder="Enter qty"
                                    className="text-right"
                                    {...formField}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" /> {/* Smaller message */}
                              </FormItem>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter className="pt-4 mt-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={receiveItemsMutation.isPending}>
                {receiveItemsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Received Items
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 
 