import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadProps {
  initialFiles?: { id?: string; url: string }[]; // Existing images with URL and optional ID
  onFilesChange: (newFiles: File[], deletedIds?: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // In bytes
  className?: string;
  disabled?: boolean;
}

interface FilePreview extends File {
  preview: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  initialFiles = [], 
  onFilesChange, 
  maxFiles = 5, 
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  disabled = false
}) => {
  const [previews, setPreviews] = useState<FilePreview[]>([]); // New files with preview URLs
  const [existingImages, setExistingImages] = useState(initialFiles);
  const [deletedExistingImageIds, setDeletedExistingImageIds] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ errors }: any) => {
        errors.forEach((err: any) => {
          if (err.code === 'file-too-large') {
            toast.error(`Error: File is larger than ${maxSize / 1024 / 1024}MB`);
          } else if (err.code === 'too-many-files') {
            toast.error(`Error: Cannot upload more than ${maxFiles} files`);
          } else {
            toast.error(`Error: ${err.message}`);
          }
        });
      });
      return;
    }

    const totalFiles = previews.length + existingImages.length + acceptedFiles.length;
    if (totalFiles > maxFiles) {
        toast.error(`Cannot upload more than ${maxFiles} files in total.`);
        return;
    }

    const newPreviews = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));

    setPreviews(currentPreviews => [...currentPreviews, ...newPreviews]);
    onFilesChange([...previews, ...newPreviews], deletedExistingImageIds);

  }, [previews, existingImages, maxFiles, maxSize, onFilesChange, deletedExistingImageIds]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }, // Accept common image types
    maxSize,
    maxFiles: maxFiles - (previews.length + existingImages.length), // Dynamically adjust maxFiles allowed in picker
    disabled: disabled || (previews.length + existingImages.length) >= maxFiles
  });

  const removePreview = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previews[index].preview);
    onFilesChange(newPreviews, deletedExistingImageIds);
  };

  const removeExistingImage = (id: string | undefined, url: string) => {
      if (id) {
        setDeletedExistingImageIds(prev => [...prev, id]);
      }
      setExistingImages(prev => prev.filter(img => img.url !== url));
      // Notify parent about the change including the deleted ID
      onFilesChange(previews, id ? [...deletedExistingImageIds, id] : deletedExistingImageIds);
  };

  // Clean up previews on unmount
  useEffect(() => {
    return () => previews.forEach(file => URL.revokeObjectURL(file.preview));
  }, [previews]);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 px-4 text-center border-2 border-dashed rounded-lg cursor-pointer",
          "border-gray-300 dark:border-gray-600",
          isDragActive ? "border-primary bg-primary/10" : "hover:border-gray-400 dark:hover:border-gray-500",
          (disabled || (previews.length + existingImages.length) >= maxFiles) && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-8 h-8 text-gray-500 dark:text-gray-400 mb-2" />
        {isDragActive ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Drop the images here ...</p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF, WEBP up to {maxSize / 1024 / 1024}MB</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Maximum {maxFiles} images</p>
      </div>

      {(previews.length > 0 || existingImages.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {/* Display existing images */}  
          {existingImages.map((image) => (
            <div key={image.url} className="relative group aspect-square">
              <img
                src={image.url}
                alt="Existing property image"
                className="object-cover w-full h-full rounded-md"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { 
                      e.stopPropagation(); // Prevent dropzone activation
                      removeExistingImage(image.id, image.url); 
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          {/* Display new file previews */}  
          {previews.map((file, index) => (
            <div key={file.preview} className="relative group aspect-square">
              <img
                src={file.preview}
                alt={`Preview ${file.name}`}
                className="object-cover w-full h-full rounded-md"
                onLoad={() => { URL.revokeObjectURL(file.preview); }} // Clean up URL after load
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); removePreview(index); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 