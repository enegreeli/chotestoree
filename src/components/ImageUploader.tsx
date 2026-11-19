'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, ImagePlus, Trash2, Star, Link as LinkIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

/**
 * Compresses an image file using an offscreen canvas.
 * Reduces 10MB+ phone camera photos down to crisp ~100KB web-optimized images.
 */
function compressImage(file: File, maxWidth = 1000, quality = 0.80): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export as JPEG with optimal compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 8,
}: ImageUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setProcessing(true);
    try {
      const remainingSlots = maxImages - images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const processedUrls: string[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImage(file);
        processedUrls.push(dataUrl);
      }

      if (processedUrls.length > 0) {
        onChange([...images, ...processedUrls]);
      }
    } catch (err) {
      console.error('Error processing images:', err);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const setAsPrimary = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const target = images[indexToPrimary];
    const rest = images.filter((_, idx) => idx !== indexToPrimary);
    onChange([target, ...rest]);
  };

  const addManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    onChange([...images, manualUrl.trim()]);
    setManualUrl('');
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-black bg-neutral-100 scale-[1.01]'
            : 'border-neutral-300 hover:border-black bg-neutral-50/70 hover:bg-neutral-100/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="product-image-file-input"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-neutral-800">
            {processing ? (
              <Loader2 className="w-7 h-7 animate-spin text-black" />
            ) : (
              <ImagePlus className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-neutral-900">
              {processing
                ? 'Otimizando e carregando fotos...'
                : 'Escolher fotos do PC ou Celular'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Clique aqui ou arraste seus arquivos (PNG, JPG, WEBP). Suporta fotos da galeria ou câmera do celular.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors">
            <UploadCloud className="w-4 h-4" />
            <span>Selecionar do Dispositivo</span>
          </div>
        </div>
      </div>

      {/* Manual URL Toggle Option */}
      <div className="flex items-center justify-between text-xs pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-neutral-500 hover:text-black flex items-center gap-1 font-medium transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          {showUrlInput ? 'Ocultar opção de link' : 'Ou colar link direto da internet'}
        </button>

        <span className="text-neutral-400 font-medium">
          {images.length} de {maxImages} fotos adicionadas
        </span>
      </div>

      {/* Manual URL Input Bar */}
      {showUrlInput && (
        <form onSubmit={addManualUrl} className="flex gap-2 p-3 bg-neutral-100 rounded-xl animate-in fade-in duration-150">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://exemplo.com/foto-do-produto.jpg"
            className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Adicionar Link
          </button>
        </form>
      )}

      {/* Thumbnails Grid Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              className={`group relative aspect-[4/5] bg-neutral-100 rounded-xl overflow-hidden border-2 transition-all ${
                idx === 0 ? 'border-neutral-900 shadow-md ring-2 ring-black/10' : 'border-neutral-200'
              }`}
            >
              {/* Photo Preview */}
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />

              {/* Badges and Actions Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-wider shadow">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Principal
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(idx)}
                      className="px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 hover:bg-white text-[10px] font-bold tracking-wider uppercase transition-colors shadow"
                      title="Definir como foto principal"
                    >
                      Tornar Principal
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="p-1.5 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors shadow"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-bold text-white text-center">
                  Foto #{idx + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

