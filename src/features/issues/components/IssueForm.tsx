import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import React, { useState, ChangeEvent } from 'react'; // Import useState, ChangeEvent

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed DbUserProfile import as it wasn't used
import { IssueCategory } from "../types";
import { Label } from "@/components/ui/label"; // Import Label for file input

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(IssueCategory),
  priority: z.enum(["low", "medium", "high"] as const),
  estimated_cost: z.coerce.number().nullable(),
  property_id: z.string().min(1, "Property is required"),
  assigned_to_user_id: z.string().nullable(),
  booking_id: z.string().nullable(),
  // Note: File input is handled separately, not part of zod schema usually
});

export type FormSchema = z.infer<typeof formSchema>;

interface IssueFormProps {
  issue?: { // Simplified type for default values
    title: string;
    description: string | null;
    category: IssueCategory;
    priority: "low" | "medium" | "high";
    estimated_cost: number | null;
    property_id: string | null;
    assigned_to_user_id: string | null;
    booking_id: string | null;
  };
  // onSubmit now only passes form data, file handling is separate
  onSubmit: (data: FormSchema) => Promise<string | undefined>; // Modified to return potential issue ID
  onFilesChange?: (files: FileList | null) => void; // Prop to pass selected files up
  properties?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; full_name: string }>;
  bookings?: Array<{ id: string; reference: string }>; // Use reference from parent
  isSubmitting?: boolean; // Added isSubmitting prop
  canEditDetails?: boolean;
  canAssign?: boolean;
}

export function IssueForm({
  issue,
  onSubmit,
  onFilesChange, // Receive the handler
  properties,
  users,
  bookings,
  isSubmitting, // Receive submitting state
  canEditDetails = true,
  canAssign = true
}: IssueFormProps) {

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: issue?.title ?? "",
      description: issue?.description ?? "",
      category: issue?.category ?? IssueCategory.MAINTENANCE,
      priority: issue?.priority ?? "low",
      estimated_cost: issue?.estimated_cost ?? null,
      property_id: issue?.property_id ?? "",
      assigned_to_user_id: issue?.assigned_to_user_id ?? null,
      booking_id: issue?.booking_id ?? null,
    },
  });

  // Handle form submission (now just calls the passed onSubmit)
  const handleSubmit = async (values: FormSchema) => {
    try {
      // onSubmit is expected to handle the actual mutation (create/update)
      // and potentially return the issue ID for file uploads
      await onSubmit(values);
      toast.success("Issue saved successfully");
    } catch (error) {
      console.error("Error saving issue:", error);
      toast.error("Failed to save issue");
    }
  };

  // Handler for file input changes
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (onFilesChange) {
      onFilesChange(event.target.files);
    }
  };

  // Determine if the main submit button should be disabled
  // Disable if user can neither edit details NOR assign
  const isSubmitDisabled = !canEditDetails && !canAssign;

  return (
    <Form {...form}>
      {/* Use form's handleSubmit */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Leaking pipe under kitchen sink" {...field} disabled={!canEditDetails} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Provide details about the issue..." {...field} value={field.value ?? ''} disabled={!canEditDetails} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Property Field */}
        {properties && (
          <FormField
            control={form.control}
            name="property_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value ?? undefined}
                  disabled={!canEditDetails}
                >
                   <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                   </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

         {/* Booking Dropdown */}
        {bookings && (
          <FormField
            control={form.control}
            name="booking_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Related Booking (Optional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "--none--" ? null : value)}
                  value={field.value ?? "--none--"} // Use placeholder value
                  disabled={!canEditDetails}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Select booking --" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value="--none--">-- None --</SelectItem>
                     {/* Filter out potential null/undefined bookings */}
                    {bookings.filter(b => b && b.id).map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.reference} {/* Use the display reference */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEditDetails}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Map over enum values */}
                    {Object.values(IssueCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEditDetails}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Estimated Cost & Assignee */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="estimated_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Optional cost estimate"
                      {...field}
                      value={field.value ?? ''} // Handle null
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={!canEditDetails}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Assigned To Field - Conditionally render based on canAssign */}
            {users && canAssign && (
              <FormField
                control={form.control}
                name="assigned_to_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                      disabled={!canAssign} // Keep disabled logic just in case, though field shouldn't render
                    >
                       <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                            </SelectItem>
                        ))}
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
         </div>

        {/* --- NEW Image Upload Section --- */}
        <div>
          <Label htmlFor="issue-images">Attach Images (Optional)</Label>
          <Input
            id="issue-images"
            type="file"
            multiple // Allow multiple files
            accept="image/png, image/jpeg, image/gif" // Specify accepted types
            onChange={handleFileChange} // Call handler on change
            className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            You can upload multiple PNG, JPG, or GIF files.
          </p>
        </div>
        {/* --- END Image Upload Section --- */}

        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? 'Saving...' : (issue ? "Update Issue" : "Create Issue")}
        </Button>
      </form>
    </Form>
  );
}
