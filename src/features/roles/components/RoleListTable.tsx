// src/features/roles/components/RoleListTable.tsx
import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useGetRoles } from '@/features/roles/hooks/useRoles';
import { Role } from '@/features/roles/types';
import { useAuth } from '@/app/AuthProvider';
import { RoleForm } from './RoleForm'; // To be created
import { DeleteRoleDialog } from './DeleteRoleDialog'; // To be created

// --- Column Definitions ---
const getColumns = (
    onEdit: (role: Role) => void,
    onDelete: (role: Role) => void,
    canEdit: boolean // 'edit_roles' permission covers edit and delete
): ColumnDef<Role>[] => [
    {
        accessorKey: 'name',
        header: 'Role Name',
        cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => row.getValue('description') || <span className="text-muted-foreground">N/A</span>,
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const role = row.original;
            // Disable actions for SuperAdmin/Basic Staff? Maybe add check later if needed.
            // const isProtectedRole = ['SuperAdmin', 'Basic Staff'].includes(role.name);
            if (!canEdit /* || isProtectedRole */) return null; // Only show if user can edit roles

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
                        <DropdownMenuItem onClick={() => onEdit(role)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(role)}
                            className="text-red-600 focus:text-red-600"
                            // Optionally disable delete for specific roles like SuperAdmin
                            // disabled={role.name === 'SuperAdmin'}
                        >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];


// --- Main Table Component ---
export function RoleListTable() {
    const { data: roles = [], isLoading, error } = useGetRoles();
    const { permissions } = useAuth();
    const [sorting, setSorting] = useState<SortingState>([]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    // 'edit_roles' permission grants ability to add, edit, and delete roles
    const canManageRoles = permissions['edit_roles'] === true;

    const handleAddNew = () => {
        setSelectedRole(null);
        setIsFormOpen(true);
    };

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setIsFormOpen(true);
    };

    const handleDelete = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns(handleEdit, handleDelete, canManageRoles);

    const table = useReactTable({
        data: roles,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
        sorting,
        },
        initialState: {
            pagination: { pageSize: 10 }
        }
    });

    // ADD LOGGING HERE
    console.log('[RoleListTable] State:', { isLoading, error: error?.message, rolesCount: roles.length });

    if (isLoading) {
        console.log('[RoleListTable] Rendering Loading State');
        return <div>Loading roles...</div>; // Add Skeleton later
    }
    if (error) {
        console.log('[RoleListTable] Rendering Error State:', error.message);
        return <div className="text-red-600">Error loading roles: {error.message}</div>;
    }

    // Log before rendering the main table content
    console.log('[RoleListTable] Rendering Table Content');

    return (
        <div className="w-full">
            <div className="flex items-center justify-end py-4">
                {/* Add New Button */}
                {canManageRoles && (
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Role
                </Button>
                )}
            </div>
            {/* Table */}
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                            {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                                )}
                        </TableHead>
                        ))}
                    </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
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
                        No roles found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
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

            {/* Dialogs/Sheets for Forms */}
            <RoleForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                role={selectedRole} // Pass null for create, role data for edit
            />

             <DeleteRoleDialog
                isOpen={isDeleteDialogOpen}
                setIsOpen={setIsDeleteDialogOpen}
                role={roleToDelete}
            />
        </div>
    );
}
