import { useState, useCallback, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

interface ImageUploadProps {
  // Will add props later for existing images, upload function, etc.
  // Example: existingImages?: { id: string, url: string }[];
  // Example: onUpload: (file: File) => Promise<string | null>; // Returns URL or null on failure
  // Example: onDelete: (imageId: string) => Promise<void>;
  disabled?: boolean;
}

export function ImageUpload({ disabled }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      // Simple validation (optional)
      const validFiles = filesArray.filter(file => file.type.startsWith('image/'));
      if (validFiles.length !== filesArray.length) {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Only image files are allowed.",
          });
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);

      // Generate previews
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);

      // Clear the input value to allow selecting the same file again
      event.target.value = '';
    }
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke object URL to free memory
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  }, []);

  // TODO: Implement actual upload logic here later
  const handleUpload = async () => {
      toast({ title: "Upload Placeholder", description: "Actual upload logic not yet implemented." });
      // 1. Loop through selectedFiles
      // 2. For each file, call Supabase storage upload function
      // 3. Get URL on success
      // 4. Call a prop function (e.g., onUploadComplete) with the URLs
      // 5. Handle errors
  }

  return (
    <div className="space-y-4">
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag & drop images here, or click to select</p>
             <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="sr-only" // Hide the default input visually
                accept="image/*" // Accept only image types
                disabled={disabled}
            />
            <label htmlFor="file-upload" className={cn(
                 "mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary cursor-pointer",
                 disabled && "opacity-50 cursor-not-allowed"
            )}>
                Select Images
            </label>

        </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((previewUrl, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={previewUrl}
                alt={`Preview ${index + 1}`}
                className="object-cover w-full h-full rounded-md"
                onLoad={() => {
                    // Optional: Could revoke URL here if worried about memory,
                    // but might cause flicker if component re-renders.
                    // Revoking in removeFile is safer.
                    // URL.revokeObjectURL(previewUrl);
                 }}
              />
              {!disabled && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TODO: Add button to trigger handleUpload - disabled until files selected */}
       {/* <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || disabled}>
           Upload Selected Images (Placeholder)
       </Button> */}

        {/* TODO: Display existing images passed via props, with delete buttons */}

    </div>
  );
} 