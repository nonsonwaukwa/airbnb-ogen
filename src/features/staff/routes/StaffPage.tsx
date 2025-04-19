import { StaffListTable } from '@/features/staff/components/StaffListTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Optional: Wrap in a card

export function StaffPage() {
  return (
     // Optional Card wrapper for consistent page styling
    <Card>
        <CardHeader>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>Invite, view, and manage staff members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
             <StaffListTable />
        </CardContent>
    </Card>

    // Or just render the table directly
    // <StaffListTable />
  );
} 