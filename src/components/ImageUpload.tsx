import { useState, useCallback, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast'; // Corrected import path assuming it's in ui folder
import { cn } from '@/lib/utils'; // Assuming cn utility exists
import { Label } from '@/components/ui/label'; // Assuming Label component exists

interface ImageUploadProps {
  // Props for handling file changes and existing images will be needed later
  onFilesChange?: (files: File[]) => void; // Callback when files are selected/removed
  // Example: existingImages?: { id: string, url: string }[];
  // Example: onUpload: (files: File[]) => Promise<void>; // Function to trigger upload
  // Example: onDeleteExisting: (imageId: string) => Promise<void>;
  disabled?: boolean;
}

// Make sure useToast is correctly imported and used if needed outside this component
// If useToast is specific to shadcn/ui, ensure it's initialized correctly in your app root.

export function ImageUpload({ disabled, onFilesChange }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast(); // Uncommented and using the hook

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const validFiles = filesArray.filter(file => file.type.startsWith('image/'));

      // Show toast notification if invalid files were selected
      if (validFiles.length !== filesArray.length) {
          console.warn("Some selected files were not valid image types.");
          // Show a toast message
          toast({
              variant: "destructive",
              title: "Invalid File Type",
              description: `Only image files are allowed. ${filesArray.length - validFiles.length} file(s) were ignored.`,
          });
      }

      // Update state with the new valid files
      const newSelectedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newSelectedFiles);

      // Generate previews for the newly added valid files
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);

      // Call the callback prop if provided
      if (onFilesChange) {
          onFilesChange(newSelectedFiles);
      }

      // Clear the input value to allow selecting the same file again
      event.target.value = '';
    }
  }, [selectedFiles, onFilesChange, toast]); // Added toast to dependency array

  const removeFile = useCallback((index: number) => {
    // Revoke object URL before removing from state
    URL.revokeObjectURL(previews[index]);

    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);

     // Call the callback prop if provided
     if (onFilesChange) {
        onFilesChange(updatedFiles);
     }

  }, [selectedFiles, previews, onFilesChange]); // Dependency array

  // Placeholder for actual upload logic triggered by parent component
  // const handleUpload = async () => {
  //     console.log("Uploading files:", selectedFiles);
  //     // Logic to upload selectedFiles
  // }

  return (
    <div className="space-y-4">
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag & drop images here, or click below</p>
             <Input
                id="file-upload-input" // Changed ID slightly for clarity
                type="file"
                multiple
                onChange={handleFileChange}
                className="sr-only" // Hide the default input visually
                accept="image/png, image/jpeg, image/gif" // Specify accepted types
                disabled={disabled}
            />
            {/* Use Label component associated with the input */}
            <Label htmlFor="file-upload-input" className={cn(
                 "mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer",
                 disabled && "opacity-50 cursor-not-allowed"
            )}>
                Select Images
            </Label>

        </div>

      {/* Display number of selected files (Fixes TS6133) */}
      {selectedFiles.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {selectedFiles.length} image(s) selected.
        </p>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((previewUrl, index) => (
            <div key={previewUrl} className="relative group aspect-square"> {/* Use URL as key */}
              <img
                src={previewUrl}
                alt={`Preview ${index + 1}`}
                className="object-cover w-full h-full rounded-md border" // Added border
                // Remove onLoad revoke, handle in removeFile or useEffect cleanup
              />
              {!disabled && (
                  <Button
                    type="button" // Ensure it's not submitting a form
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10" // Ensure button is clickable
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent potential parent clicks
                        removeFile(index);
                    }}
                    aria-label="Remove image" // Better accessibility
                  >
                    <X className="h-4 w-4" />
                  </Button>
              )}
            </div>
          ))}
        </div>
      )}

       {/* Note: The actual upload trigger button is usually in the parent form */}

    </div>
  );
}
