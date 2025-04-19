import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea if used
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { useInviteStaff, useUpdateStaff } from '@/features/staff/hooks/useStaff';
// Assuming useGetRolesForSelect exists and works as intended
import { useGetRolesForSelect } from '@/features/staff/hooks/useRolesForSelect';
import type { StaffMember, InviteStaffPayload, UpdateStaffPayload, RoleOption } from '@/features/staff/types';


// Schema Definition
const staffFormSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email({ message: 'Valid email is required.' }),
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().nullable().optional(),
  role_id: z.string().uuid().min(1, { message: 'Please select a role.' }),
  employment_date: z.date().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Infer the type directly from the schema
type StaffFormValues = z.infer<typeof staffFormSchema>;

// Component Props
interface StaffFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  staffMember: StaffMember | null; // Use StaffMember type which includes role object
}

export function StaffForm({ isOpen, setIsOpen, staffMember }: StaffFormProps) {
  const isEditMode = !!staffMember;
  // Use the specific hook for select options
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

  // Reset form when staffMember changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && staffMember) {
        const formStatus = (staffMember.status === 'pending' || staffMember.status === 'active') ? 'active' : 'inactive';
        reset({
          id: staffMember.user_id, // Assuming StaffMember type uses user_id
          email: staffMember.email,
          full_name: staffMember.full_name,
          phone: staffMember.phone ?? null,
          role_id: staffMember.role?.id || '',
          employment_date: typeof staffMember.employment_date === 'string' ? parseISO(staffMember.employment_date) : staffMember.employment_date instanceof Date ? staffMember.employment_date : null,
          status: formStatus,
        });
      } else {
        // Reset for invite mode
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
      <SheetContent className="sm:max-w-lg overflow-y-auto"> {/* Enable scrolling on content */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b"> {/* Adjust padding/border */}
          <SheetTitle>{isEditMode ? 'Edit Staff Member' : 'Invite New Staff'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the details for this staff member.' : 'Enter the details for the new staff member.'}
          </SheetDescription>
        </SheetHeader>
        {/* Added px-6 to form for consistent padding */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-hidden">
          {/* ScrollArea wraps the main form inputs */}
          {/* Added flex-1 to ScrollArea to make it take available space */}
          <ScrollArea className="flex-1 px-6 py-6">
            <div className="grid gap-6"> {/* Increased gap */}
              {/* Email */}
              <div className="grid grid-cols-4 items-center gap-x-4"> {/* Use gap-x */}
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  readOnly={isEditMode}
                  disabled={isLoading || isEditMode}
                  // Added focus-visible override to remove ring
                  className={cn(
                    "col-span-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    isEditMode && 'cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                  )}
                  {...register('email')}
                />
                {errors.email && <p className="col-span-full text-right text-xs text-red-600">{errors.email.message}</p>}
              </div>

              {/* Full Name */}
              <div className="grid grid-cols-4 items-center gap-x-4">
                <Label htmlFor="full_name" className="text-right">Full Name</Label>
                <Input
                  id="full_name"
                  disabled={isLoading}
                  // Added focus-visible override to remove ring
                  className="col-span-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...register('full_name')}
                />
                 {errors.full_name && <p className="col-span-full text-right text-xs text-red-600">{errors.full_name.message}</p>}
              </div>

               {/* Phone */}
               <div className="grid grid-cols-4 items-center gap-x-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input
                  id="phone"
                  disabled={isLoading}
                  // Added focus-visible override to remove ring
                  className="col-span-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...register('phone')}
                />
                 {/* Optional: Add phone validation error display */}
              </div>

              {/* Role */}
              <div className="grid grid-cols-4 items-center gap-x-4">
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
                            {/* Added focus-visible override to trigger */}
                            <SelectTrigger className="col-span-3 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingRoles ? (
                                    <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                                ) : (
                                    roles.map((role: RoleOption) => (
                                    <SelectItem key={role.id} value={role.id}>
                                        {role.name}
                                    </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    )}
                />
                 {errors.role_id && <p className="col-span-full text-right text-xs text-red-600">{errors.role_id.message}</p>}
              </div>

              {/* Employment Date */}
               <div className="grid grid-cols-4 items-center gap-x-4">
                    {/* Removed text-right from Label */}
                    <Label htmlFor="employment_date">Employment Date</Label>
                    <Controller
                        name="employment_date"
                        control={control}
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    {/* Added focus-visible override to button trigger */}
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "col-span-3 w-full justify-start text-left font-normal focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
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
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                     />
                     {errors.employment_date && <p className="col-span-full text-right text-xs text-red-600">{errors.employment_date.message}</p>}
               </div>

              {/* Status (Edit mode only) */}
               {isEditMode && (
                    <div className="grid grid-cols-4 items-center gap-x-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                         <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? 'active'} // Default to active if somehow null
                                    disabled={isLoading}
                                >
                                     {/* Added focus-visible override to trigger */}
                                    <SelectTrigger className="col-span-3 capitalize focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
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
            </div>
          </ScrollArea> {/* End ScrollArea */}

          {/* Footer is outside scroll area, pushed down by flex-1 on ScrollArea */}
          <SheetFooter className="px-0 pt-4 pb-6 border-t bg-background"> {/* Use px-0 as form has padding */}
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={isLoading}>
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Send Invite'}
            </Button>
          </SheetFooter>
        </form> {/* End Form */}
      </SheetContent>
    </Sheet>
  );
}
