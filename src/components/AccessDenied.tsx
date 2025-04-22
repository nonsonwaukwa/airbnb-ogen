import React from 'react';

const AccessDenied = () => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]"> {/* Adjust height as needed */}
      <div className="text-center p-8 border rounded-lg shadow-md bg-card text-card-foreground max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-destructive mb-4">Access Denied</h2>
        <p className="text-muted-foreground">
            You do not have the necessary permissions to view this page or perform this action.
        </p>
         {/* Optional: Add a link back to dashboard or previous page */}
         {/* <Button variant="link" onClick={() => window.history.back()} className="mt-4">Go Back</Button> */}
      </div>
    </div>
  );
};

export default AccessDenied; 