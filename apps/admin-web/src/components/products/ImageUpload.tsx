'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File | null) => void;
  onPreviewChange: (preview: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

export default function ImageUpload({
  value,
  onChange,
  onPreviewChange,
  disabled = false,
}: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert('El archivo es muy grande. Tamaño máximo: 5MB');
          return;
        }

        onChange(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          onPreviewChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange, onPreviewChange]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    onPreviewChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Imagen del Producto
      </label>

      {value ? (
        // Preview
        <div className="relative">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-50">
            <Image
              src={value}
              alt="Product preview"
              fill
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Dropzone
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
            isDragActive
              ? 'border-purple-500 bg-purple-50'
              : isDragReject
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            {isDragActive ? (
              <>
                <Upload className="mb-3 h-12 w-12 text-purple-500" />
                <p className="text-sm font-medium text-purple-700">
                  Suelta la imagen aquí
                </p>
              </>
            ) : isDragReject ? (
              <>
                <ImageIcon className="mb-3 h-12 w-12 text-red-500" />
                <p className="text-sm font-medium text-red-700">
                  Tipo de archivo no soportado
                </p>
                <p className="mt-1 text-xs text-red-600">
                  Solo imágenes JPG, PNG, WebP o GIF
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-12 w-12 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  Arrastra una imagen o{' '}
                  <span className="text-purple-600">haz clic para seleccionar</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  JPG, PNG, WebP o GIF hasta 5MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* File info */}
      <p className="text-xs text-gray-500">
        Recomendado: imágenes cuadradas de 512×512px o superiores
      </p>
    </div>
  );
}
