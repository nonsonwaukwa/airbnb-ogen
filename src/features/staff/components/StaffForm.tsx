import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { useInviteStaff, useUpdateStaff } from '@/features/staff/hooks/useStaff';
import { useGetRolesForSelect } from '@/features/staff/hooks/useRolesForSelect'; // Using the simple hook
import type { StaffMember, InviteStaffPayload, UpdateStaffPayload } from '@/features/staff/types'; // Import types


// Schema Definition
const staffFormSchema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: 'Valid email is required.' }),
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().nullable().optional(),
  role_id: z.string().min(1, { message: 'Please select a role.' }), // Use min(1) for required select
  employment_date: z.date().nullable().optional(), // Expect Date object or null
  status: z.enum(['active', 'inactive']).optional(),
});

// Infer the type directly from the schema
type StaffFormValues = z.infer<typeof staffFormSchema>;

// Component Props
interface StaffFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  staffMember: StaffMember | null;
}

export function StaffForm({ isOpen, setIsOpen, staffMember }: StaffFormProps) {
  const isEditMode = !!staffMember;
  const { data: roles = [], isLoading: isLoadingRoles } = useGetRolesForSelect();
  const inviteMutation = useInviteStaff();
  const updateMutation = useUpdateStaff();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
        id: undefined,
        email: '',
        full_name: '',
        phone: null,
        role_id: '',
        employment_date: null,
        status: 'active',
    }
  });

  // Reset form when staffMember changes (e.g., opening edit after invite) or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && staffMember) {
        // Handle 'pending' status from DB - default to 'active' in the form if seen
        const formStatus = (staffMember.status === 'pending' || staffMember.status === 'active') ? 'active' : 'inactive';
        reset({
          id: staffMember.id,
          email: staffMember.email,
          full_name: staffMember.full_name,
          phone: staffMember.phone ?? null, // Ensure null if undefined/null
          role_id: staffMember.role?.id || '',
          employment_date: staffMember.employment_date ? parseISO(staffMember.employment_date) : null,
          status: formStatus,
        });
      } else {
        // Reset for invite mode (matches defaultValues)
        reset({
            id: undefined,
            email: '',
            full_name: '',
            phone: null,
            role_id: '',
            employment_date: null,
            status: 'active',
        });
      }
    }
  }, [staffMember, isEditMode, isOpen, reset]);


  const onSubmit = async (values: StaffFormValues) => {
      // Format date back to string or null for the API/DB payload
      const formattedEmploymentDate = values.employment_date ? format(values.employment_date, 'yyyy-MM-dd') : null;

      try {
        if (isEditMode && values.id) {
          // Update Mode
          const updatePayload: UpdateStaffPayload = {
            id: values.id,
            full_name: values.full_name,
            phone: values.phone || null,
            role_id: values.role_id,
            employment_date: formattedEmploymentDate,
            status: values.status,
          };
          await updateMutation.mutateAsync(updatePayload);
          toast.success('Staff member updated successfully!');
        } else {
          // Invite Mode
          const invitePayload: InviteStaffPayload = {
             email: values.email,
             full_name: values.full_name,
             phone: values.phone || null,
             role_id: values.role_id,
             employment_date: formattedEmploymentDate,
          };
          await inviteMutation.mutateAsync(invitePayload);
          toast.success('Staff member invited successfully!');
        }
        setIsOpen(false);
      } catch (error: any) {
          console.error("Form submission error:", error);
          toast.error(error.message || 'An error occurred.');
      }
  };

  // Determine combined loading state
  const isLoading = isSubmitting || inviteMutation.isPending || updateMutation.isPending || isLoadingRoles;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Staff Member' : 'Invite New Staff'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the details for this staff member.' : 'Enter the details for the new staff member.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-6">
          {/* Email */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input
              id="email"
              type="email"
              readOnly={isEditMode} // Email is read-only in edit mode
              disabled={isLoading || isEditMode}
              className={`col-span-3 ${isEditMode ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
              {...register('email')}
            />
            {errors.email && <p className="col-span-4 text-right text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Full Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="full_name" className="text-right">Full Name</Label>
            <Input
              id="full_name"
              disabled={isLoading}
              className="col-span-3"
              {...register('full_name')}
            />
             {errors.full_name && <p className="col-span-4 text-right text-xs text-red-600">{errors.full_name.message}</p>}
          </div>

           {/* Phone */}
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <Input
              id="phone"
              disabled={isLoading}
              className="col-span-3"
              {...register('phone')}
            />
             {/* Optional: Add phone validation error display */}
          </div>

          {/* Role */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role_id" className="text-right">Role</Label>
            <Controller
                name="role_id"
                control={control}
                render={({ field }) => (
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingRoles || isLoading}
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingRoles ? (
                                <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                            ) : (
                                roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                )}
            />
             {errors.role_id && <p className="col-span-4 text-right text-xs text-red-600">{errors.role_id.message}</p>}
          </div>

          {/* Employment Date */}
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employment_date" className="text-right">Employment Date</Label>
                <Controller
                    name="employment_date"
                    control={control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "col-span-3 justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                     disabled={isLoading}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={field.value ?? undefined}
                                    onSelect={field.onChange}
                                    initialFocus
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                 />
                 {errors.employment_date && <p className="col-span-4 text-right text-xs text-red-600">{errors.employment_date.message}</p>}
           </div>

          {/* Status (Edit mode only) */}
           {isEditMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Status</Label>
                     <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="col-span-3 capitalize">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="active">Active</SelectItem>
                                     <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                     />
                 </div>
           )}

        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
          </SheetClose>
          <Button type="submit" disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Send Invite'}
          </Button>
        </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
} 