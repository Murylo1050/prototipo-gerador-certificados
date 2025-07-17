// src/components/ImageUploader.tsx
import React, { ChangeEvent } from 'react';

interface ImageUploaderProps {
  onImageLoad: (imageDataUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoad }) => {
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageLoad(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <input type="file" accept="image/*" onChange={handleImageChange} />
    </div>
  );
};

export default ImageUploader;