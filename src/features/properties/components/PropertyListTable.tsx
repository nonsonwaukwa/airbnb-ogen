import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    flexRender, 
    getCoreRowModel, 
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable 
} from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
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
import { useGetProperties, useDeleteProperty } from '@/features/properties/hooks/useProperties';
import type { Property } from '@/features/properties/types';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state


export function PropertyListTable() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { data: properties = [], isLoading, isError, error } = useGetProperties();
  const deleteMutation = useDeleteProperty();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const canEdit = permissions.edit_properties === true;
  const canDelete = permissions.delete_properties === true;

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete.id, {
        onSuccess: () => {
            setPropertyToDelete(null);
            setShowDeleteDialog(false);
            // Toast is handled by the hook
        },
        onError: () => {
            // Toast is handled by the hook
            setPropertyToDelete(null);
            setShowDeleteDialog(false);
        }
      });
    }
  };

  // Define Columns
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: { row: any }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      id: "address",
      header: "Address",
      cell: ({ row }: { row: any }) => {
        const property = row.original;
        const addressParts = [
            property.address_street,
            property.address_city,
            property.address_lga,
            property.address_state
        ].filter(Boolean); // Remove null/empty parts
        return <span>{addressParts.join(', ') || 'N/A'}</span>;
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: { row: any }) => <span>{row.getValue("type") || 'N/A'}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: any }) => <span className="capitalize">{row.getValue("status")}</span>, // Simple capitalize
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: any }) => {
        const property = row.original;
        // Only show actions if user has edit or delete permissions
        if (!canEdit && !canDelete) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => navigate(`/properties/${property.id}`)} // Navigate to edit/view page
                >
                  Edit / View
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  onClick={() => handleDeleteClick(property)}
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
    data: properties,
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
             pageSize: 10, // Set default page size
        },
    },
  });

  // Loading and Error States
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {/* Render skeleton headers */}
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.id || (column.accessorKey as string)}>
                                <Skeleton className="h-5 w-full" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            {columns.map((column) => (
                                <TableCell key={`${i}-${column.id || column.accessorKey}`}>
                                    <Skeleton className="h-5 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  if (isError) {
    toast.error(`Error fetching properties: ${error?.message}`);
    return <div className="text-red-600">Failed to load properties. Please try again.</div>;
  }

  return (
    <div className="w-full">
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No properties found.
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
                This action cannot be undone. This will permanently delete the property
                "<span className="font-semibold">{propertyToDelete?.name}</span>" 
                and all associated data, including images.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
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
    </div>
  );
} 