import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyForm } from '@/features/properties/components/PropertyForm';
import { useAuth } from '@/app/AuthProvider';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export function PropertyCreatePage() {
  const navigate = useNavigate();
  const { permissions } = useAuth();

  // Check for required permission to add properties
  const canAdd = permissions.add_properties === true;

  if (!canAdd) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-yellow-500 bg-yellow-50 p-8 text-center text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to add new properties.</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
        </Button>
      </div>
    );
  }

  const handleSuccess = () => {
    navigate('/properties'); // Navigate back to the list on success
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-3xl font-bold">Add New Property</CardTitle>
                <CardDescription className="text-base mt-2">
                    Fill in the details for the new property.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/properties')}>
               <ArrowLeft className="mr-2 h-4 w-4"/> Back to List
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <PropertyForm onSubmitSuccess={handleSuccess} />
      </CardContent>
    </Card>
  );
} 