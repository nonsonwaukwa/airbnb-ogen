import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useGetPermissions, useGetRole, useCreateRole, useUpdateRole } from '@/features/roles/hooks/useRoles';
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from '@/features/roles/types';
import { cn } from '@/lib/utils';

// --- Zod Schema ---
const roleFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, { message: 'Role name must be at least 2 characters.' }),
  description: z.string().nullable().optional(),
  // Ensure permissions object is always fully defined
  permissions: z.record(z.boolean()).default({}),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// --- Component Props ---
interface RoleFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: Role | null; // null for create, role data for edit
}

export function RoleForm({ isOpen, setIsOpen, role }: RoleFormProps) {
  const isEditMode = !!role;

  const { data: allPermissions = [], isLoading: isLoadingPermissions } = useGetPermissions();
  // Fetch role details only if editing and the sheet is open
  const { data: roleDetails, isLoading: isLoadingRoleDetails } = useGetRole(
    isEditMode && isOpen ? role?.id : null,
    { enabled: isEditMode && isOpen } // Ensure query is enabled correctly
  );

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  // Initialize default permissions object based on allPermissions
  // This helps ensure the form starts with all keys defined if possible
  const initialPermissions = useMemo(() => {
      const defaults: Record<string, boolean> = {};
      allPermissions.forEach(p => { defaults[p.id] = false; });
      return defaults;
  }, [allPermissions]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    // Set default values including the fully initialized permissions object
    defaultValues: useMemo(() => ({
        id: role?.id,
        name: role?.name ?? '',
        description: role?.description ?? null,
        permissions: initialPermissions, // Use memoized initial state
    }), [role, initialPermissions]), // Depend on role for edit mode defaults initially
  });

  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    return allPermissions.reduce((acc, permission) => {
      const category = permission.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      acc[category].sort((a, b) => (a.description || a.id).localeCompare(b.description || b.id));
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [allPermissions]);

  const sortedCategories = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);


  // --- Form Reset Logic ---
  // This effect now primarily handles resetting when the 'role' prop changes (switching between edit/create)
  // or when roleDetails load for edit mode.
  useEffect(() => {
    // Ensure allPermissions are loaded before attempting to reset with them
    if (isOpen && !isLoadingPermissions && allPermissions.length > 0) {
        let currentPermissions = { ...initialPermissions }; // Start with all false

        if (isEditMode) {
            if (roleDetails) {
                // If editing and role details ARE loaded, check the boxes for assigned permissions
                roleDetails.permissionIds.forEach(id => {
                    if (currentPermissions.hasOwnProperty(id)) {
                        currentPermissions[id] = true;
                    }
                });
                reset({
                    id: roleDetails.id,
                    name: roleDetails.name,
                    description: roleDetails.description,
                    permissions: currentPermissions, // Use updated permissions
                });
            }
            // If roleDetails are still loading, do nothing yet, wait for next render
        } else {
            // Reset for create mode (ensure clean state if switching from edit)
            reset({
                id: undefined,
                name: '',
                description: null,
                permissions: currentPermissions, // Reset with all false
            });
        }
    } else if (isOpen && !isEditMode && !isLoadingPermissions) {
        // Ensure form resets correctly if opened directly in create mode after permissions load
         reset({
            id: undefined,
            name: '',
            description: null,
            permissions: initialPermissions,
        });
    }
  }, [role, roleDetails, isEditMode, isOpen, reset, allPermissions, isLoadingPermissions, initialPermissions]); // Added dependencies


  const onSubmit = async (values: RoleFormValues) => {
    // console.log('Form Values Submitted:', values); // Keep for debugging if needed
    const selectedPermissionIds = Object.entries(values.permissions)
      .filter(([, isChecked]) => isChecked)
      .map(([id]) => id);

    // console.log('Payload to Create/Update:', { ...values, permissionIds: selectedPermissionIds }); // Keep for debugging

    try {
      if (isEditMode && values.id) {
        const payload: UpdateRolePayload = {
          id: values.id,
          name: values.name,
          description: values.description ?? null,
          permissionIds: selectedPermissionIds,
        };
        await updateMutation.mutateAsync(payload);
        toast.success(`Role "${payload.name}" updated successfully!`);
      } else {
        const payload: CreateRolePayload = {
          name: values.name,
          description: values.description ?? null,
          permissionIds: selectedPermissionIds,
        };
        await createMutation.mutateAsync(payload);
        toast.success(`Role "${payload.name}" created successfully!`);
      }
      setIsOpen(false);
    } catch (error: any) {
      console.error("Role form submission error:", error);
      toast.error(error.message || 'An error occurred saving the role.');
    }
  };

  // Combined loading state, consider if roleDetails loading should block submit
  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending || isLoadingPermissions || (isEditMode && isLoadingRoleDetails);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-3xl w-full flex flex-col h-full">
        <SheetHeader className="px-6 pt-6 border-b">
          <SheetTitle className="text-2xl">{isEditMode ? 'Edit Role' : 'Create New Role'}</SheetTitle>
          <SheetDescription className="text-base pb-4">
            {isEditMode ? 'Update the role name, description, and permissions.' : 'Define the name, description, and permissions for the new role.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-auto px-6">
            <ScrollArea className="flex-1 py-4">
                <div className="space-y-6">
                    {/* Role Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-lg font-semibold">Role Name</Label>
                        <Input
                          id="name"
                          {...register('name')}
                          disabled={isLoading}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                    </div>

                    {/* Role Description */}
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-lg font-semibold">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          {...register('description')}
                          disabled={isLoading}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>

                    {/* Permissions */}
                    <div className="grid gap-4">
                        <h3 className="text-lg font-semibold">Permissions</h3>

                        {isLoadingPermissions ? (
                            <p>Loading permissions...</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedCategories.map((category) => (
                                    <div key={category} className="flex flex-col space-y-3 rounded-md border p-4 bg-slate-50 dark:bg-slate-800">
                                        <h4 className="font-medium text-slate-900 dark:text-slate-100">{category}</h4>
                                        {groupedPermissions[category].map((permission) => (
                                            <div key={permission.id} className="flex items-start space-x-2">
                                                <Controller
                                                    name={`permissions.${permission.id}`}
                                                    control={control}
                                                    // defaultValue={false} // Set default value here for Controller
                                                    render={({ field }) => (
                                                        <Checkbox
                                                            id={`perm-${permission.id}`}
                                                            // Ensure field.value is always boolean (handle potential undefined)
                                                            checked={!!field.value}
                                                            onCheckedChange={field.onChange}
                                                            disabled={isLoading}
                                                            className="mt-0.5 border-slate-400 dark:border-slate-600"
                                                        />
                                                    )}
                                                />
                                                <Label
                                                    htmlFor={`perm-${permission.id}`}
                                                    className="flex-1 text-sm font-normal leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer hover:text-primary"
                                                    title={permission.description ?? undefined}
                                                >
                                                    {permission.description || permission.id}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.permissions && <p className="text-xs text-red-600">Error related to permissions.</p>}
                    </div>
                </div>
            </ScrollArea> {/* End ScrollArea */}

            {/* Footer: Non-sticky */}
            <SheetFooter className="mt-auto px-0 pt-4 pb-6 bg-background border-t">
                <SheetClose asChild>
                    <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
                </SheetClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Create Role'}
                </Button>
            </SheetFooter>
        </form> {/* End Form */}
      </SheetContent>
    </Sheet>
  );
}
