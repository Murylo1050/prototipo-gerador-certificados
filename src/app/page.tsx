// src/app/page.tsx
'use client'; // Necessário para usar hooks do React no Next.js App Router

import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ImageEditor from './components/ImageEditor';
import './styles/globals.css'; // Importe seu arquivo CSS global aqui, se necessário

const HomePage: React.FC = () => {
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);

  const handleImageLoad = (imageDataUrl: string) => {
    setUploadedImageDataUrl(imageDataUrl);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', textAlign: 'center' }}>
      <h1>Editor de Imagens com Texto</h1>
      <p>Faça upload de uma imagem, selecione uma área e adicione texto!</p>

      <ImageUploader onImageLoad={handleImageLoad} />

      {uploadedImageDataUrl && (
        <ImageEditor imageDataUrl={uploadedImageDataUrl} />
      )}
    </div>
  );
};

export default HomePage;