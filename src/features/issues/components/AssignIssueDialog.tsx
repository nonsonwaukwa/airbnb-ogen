import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGetUsers } from '@/features/users/hooks/useGetUsers';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from '@/features/users/types';

interface AssignIssueDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string; // ID of the issue being assigned
  currentAssigneeId?: string | null; // To show current selection if any
  onSubmit: (userId: string) => void; // Callback when user is selected
  isSubmitting?: boolean; // To disable UI while submitting
}

export function AssignIssueDialog({
  isOpen,
  onOpenChange,
  issueId,
  currentAssigneeId,
  onSubmit,
  isSubmitting
}: AssignIssueDialogProps) {
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsers();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentAssigneeId ?? null);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setPopoverOpen(false);
    onSubmit(userId);
    onOpenChange(false);
  };

  const selectedUser = users.find((u: User) => u.id === selectedUserId);

  if (!isOpen) {
      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Issue</DialogTitle>
          <DialogDescription>
            Select a user to assign this issue to. 
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="w-full justify-between"
                disabled={isLoadingUsers || isSubmitting}
              >
                {selectedUser
                  ? selectedUser.full_name
                  : "Select user..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
              <Command shouldFilter={true}>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                    {users.map((user: User) => (
                        <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={(selectedValue: string) => {
                                handleSelectUser(selectedValue);
                            }}
                        >
                        <Check
                            className={cn(
                            "mr-2 h-4 w-4",
                            selectedUserId === user.id ? "opacity-100" : "opacity-0"
                            )}
                        />
                        {user.full_name}
                        </CommandItem>
                    ))}
                    </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {/* Footer might not be needed if selection triggers submit */}
        {/* <DialogFooter>
          <Button type="button" onClick={() => selectedUserId && onSubmit(selectedUserId)} disabled={!selectedUserId || isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
} 