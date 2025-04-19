import { useEffect, useMemo } from 'react';
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

// --- Zod Schema ---
const roleFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, { message: 'Role name must be at least 2 characters.' }),
  description: z.string().nullable().optional(),
  // Store permission IDs as an object for easier checkbox handling with react-hook-form
  permissions: z.record(z.boolean()),
});

// Form values type derived from schema
type RoleFormValues = z.infer<typeof roleFormSchema>;

// --- Component Props ---
interface RoleFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: Role | null; // null for create, role data for edit
}

export function RoleForm({ isOpen, setIsOpen, role }: RoleFormProps) {
  const isEditMode = !!role;

  // Fetch all available permissions
  const { data: allPermissions = [], isLoading: isLoadingPermissions } = useGetPermissions();

  // Fetch specific role details (including its permissions) only in edit mode
  const { data: roleDetails, isLoading: isLoadingRoleDetails } = useGetRole(isEditMode && isOpen ? role?.id : null);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch, // Watch permissions changes
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: null,
      permissions: {},
    },
  });

  // --- Group Permissions by Category ---
  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    return allPermissions.reduce((acc, permission) => {
      const category = permission.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [allPermissions]);

  // --- Form Reset Logic ---
  useEffect(() => {
    if (isOpen) {
        let defaultPermissions: Record<string, boolean> = {};
        allPermissions.forEach(p => { defaultPermissions[p.id] = false; }); // Initialize all to false

        if (isEditMode && roleDetails) {
            // If editing and role details are loaded, check the boxes for assigned permissions
            roleDetails.permissionIds.forEach(id => {
                if (defaultPermissions.hasOwnProperty(id)) {
                    defaultPermissions[id] = true;
                }
            });
            reset({
                id: roleDetails.id,
                name: roleDetails.name,
                description: roleDetails.description,
                permissions: defaultPermissions,
            });
        } else if (!isEditMode) {
            // Reset for create mode
            reset({
                id: undefined,
                name: '',
                description: null,
                permissions: defaultPermissions,
            });
        }
        // If editing but roleDetails haven't loaded yet, wait for the next effect run
    }
  }, [role, roleDetails, isEditMode, isOpen, reset, allPermissions]);


  // --- Form Submission ---
  const onSubmit = async (values: RoleFormValues) => {
    // Extract checked permission IDs from the form state
    const selectedPermissionIds = Object.entries(values.permissions)
      .filter(([, isChecked]) => isChecked)
      .map(([id]) => id);

    try {
      if (isEditMode && values.id) {
        // Update Mode
        const payload: UpdateRolePayload = {
          id: values.id,
          name: values.name,
          description: values.description ?? null,
          permissionIds: selectedPermissionIds,
        };
        await updateMutation.mutateAsync(payload);
        toast.success(`Role "${payload.name}" updated successfully!`);
      } else {
        // Create Mode
        const payload: CreateRolePayload = {
          name: values.name,
          description: values.description ?? null,
          permissionIds: selectedPermissionIds,
        };
        await createMutation.mutateAsync(payload);
        toast.success(`Role "${payload.name}" created successfully!`);
      }
      setIsOpen(false); // Close sheet on success
    } catch (error: any) {
      console.error("Role form submission error:", error);
      toast.error(error.message || 'An error occurred saving the role.');
    }
  };

  // Combined loading state
  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending || isLoadingPermissions || (isEditMode && isLoadingRoleDetails);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full px-6">
        <SheetHeader className="pt-6">
          <SheetTitle>{isEditMode ? 'Edit Role' : 'Create New Role'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the role name, description, and permissions.' : 'Define the name, description, and permissions for the new role.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-auto pt-4 pb-6">
            <div className="grid gap-6 flex-1">
                {/* Role Name */}
                <div className="grid gap-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input id="name" {...register('name')} disabled={isLoading} />
                    {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>

                {/* Role Description */}
                <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea id="description" {...register('description')} disabled={isLoading} />
                </div>

                {/* Permissions */}
                <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Permissions</h3>
                    {isLoadingPermissions ? (
                            <p>Loading permissions...</p>
                    ) : Object.entries(groupedPermissions).map(([category, permissionsInCategory]) => (
                        <div key={category} className="space-y-3 rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">{category}</h4>
                            <div className="flex flex-wrap gap-x-8 gap-y-3">
                            {permissionsInCategory.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2 min-w-[180px]">
                                    <Controller
                                        name={`permissions.${permission.id}`}
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox
                                                id={`perm-${permission.id}`}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                    <Label
                                        htmlFor={`perm-${permission.id}`}
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer hover:text-primary"
                                        title={permission.description ?? undefined}
                                    >
                                        {permission.description || permission.id}
                                    </Label>
                                </div>
                            ))}
                            </div>
                        </div>
                    ))}
                    {errors.permissions && <p className="text-xs text-red-600">Error related to permissions.</p>}
                </div>
            </div>
            
            <SheetFooter className="mt-6 pt-6 border-t sticky bottom-0 bg-white dark:bg-gray-950 py-4">
                <SheetClose asChild>
                    <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
                </SheetClose>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Create Role'}
                </Button>
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
} 