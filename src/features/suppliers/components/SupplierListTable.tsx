import React, { useState } from 'react';
import { 
    ColumnDef, 
    flexRender, 
    getCoreRowModel, 
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable 
} from "@tanstack/react-table";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from 'sonner';

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/app/AuthProvider';
import { useGetSuppliers, useDeleteSupplier } from '@/features/suppliers/hooks/useSuppliers';
import type { Supplier } from '@/features/suppliers/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierFormDialog } from './SupplierFormDialog'; // To trigger edit

export function SupplierListTable() {
  const { permissions } = useAuth();
  const { data: suppliers = [], isLoading, isError, error } = useGetSuppliers();
  const deleteMutation = useDeleteSupplier();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const canAdd = permissions.add_suppliers === true;
  const canEdit = permissions.edit_suppliers === true;
  const canDelete = permissions.delete_suppliers === true;

  const handleAddClick = () => {
      setSupplierToEdit(null); // Ensure edit state is cleared
      setIsFormOpen(true);
  };

  const handleEditClick = (supplier: Supplier) => {
      setSupplierToEdit(supplier);
      setIsFormOpen(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteMutation.mutate(supplierToDelete.id, {
        onSuccess: () => {
            setSupplierToDelete(null);
            setShowDeleteDialog(false);
        },
        onError: () => {
            setSupplierToDelete(null);
            setShowDeleteDialog(false);
        }
      });
    }
  };

  // Define Columns
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span>{row.getValue("category") || 'N/A'}</span>,
    },
    {
      accessorKey: "contact_person",
      header: "Contact Person",
       cell: ({ row }) => <span>{row.getValue("contact_person") || 'N/A'}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
       cell: ({ row }) => <span>{row.getValue("email") || 'N/A'}</span>,
    },
     {
      accessorKey: "phone",
      header: "Phone",
       cell: ({ row }) => <span>{row.getValue("phone") || 'N/A'}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <span className="capitalize">{row.getValue("status")}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const supplier = row.original;
        if (!canEdit && !canDelete) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {canEdit && (
                <DropdownMenuItem onClick={() => handleEditClick(supplier)}>
                   <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  onClick={() => handleDeleteClick(supplier)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: suppliers,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
     initialState: {
        pagination: {
             pageSize: 10,
        },
    },
  });

  // Loading and Error States
  if (isLoading) {
    // Simple Skeleton Loader for brevity
     return (
        <div className="space-y-4">
            <div className="flex justify-end"><Skeleton className="h-10 w-32" /></div>
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
     );
  }

  if (isError) {
    toast.error(`Error fetching suppliers: ${error?.message}`);
    return <div className="text-red-600">Failed to load suppliers.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-end py-4">
        {canAdd && (
          <Button onClick={handleAddClick}>
             <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No suppliers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
            </div>
            <div className="space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                Next
            </Button>
            </div>
        </div>

      {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                 This action cannot be undone. This will permanently delete the supplier
                 "<span className="font-semibold">{supplierToDelete?.name}</span>".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                 >
                   {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                   Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Form Dialog */}
        <SupplierFormDialog
            isOpen={isFormOpen}
            setIsOpen={setIsFormOpen}
            supplier={supplierToEdit} // Pass null for add, supplier data for edit
        />
    </div>
  );
} 