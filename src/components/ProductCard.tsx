'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand?: string;
    team?: string | null;
    country?: string | null;
    season?: string | null;
    modelType?: string;
    price: number;
    promoPrice?: number | null;
    isFeatured?: boolean;
    isBestSeller?: boolean;
    isNewRelease?: boolean;
    isPromo?: boolean;
    totalStock?: number;
    isOutOfStock?: boolean;
    acquisitionCost?: number;
    images?: Array<{ url: string; isPrimary?: boolean }>;
    sizes?: Array<{ id: string; size: string; stock: number }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState(false);

  const isFavorited = isInWishlist(product.id);
  const primaryImg = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800';
  const secondaryImg = product.images?.[1]?.url || primaryImg;

  const effectivePrice = product.promoPrice || product.price;
  const discountPercent = product.promoPrice
    ? Math.round(((product.price - product.promoPrice) / product.price) * 100)
    : 0;

  // Real-time stock calculation fallback
  const calculatedTotalStock = product.totalStock !== undefined
    ? product.totalStock
    : (product.sizes || []).reduce((acc: number, s: any) => acc + (Number(s.stock) || 0), 0);
  const isOutOfStock = product.isOutOfStock !== undefined
    ? product.isOutOfStock
    : (calculatedTotalStock <= 0);

  const handleQuickAdd = (e: React.MouseEvent, size: string, maxStock: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (maxStock <= 0) return;

    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: primaryImg,
        size,
        unitPrice: effectivePrice,
        costPrice: product.acquisitionCost || 0,
        maxStock,
      },
      1
    );

    setSelectedSize(size);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-neutral-100 hover:border-neutral-300 transition-all duration-300 hover:shadow-lg">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {isOutOfStock ? (
          <span className="bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
            Esgotado
          </span>
        ) : (
          <>
            {product.isBestSeller && (
              <span className="bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Mais Vendido
              </span>
            )}
            {product.isNewRelease && (
              <span className="bg-white text-neutral-900 border border-neutral-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Lançamento
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                -{discountPercent}%
              </span>
            )}
          </>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product.id);
        }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all text-neutral-600 hover:text-rose-600"
        title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFavorited ? 'fill-rose-600 text-rose-600' : 'stroke-current'
          }`}
        />
      </button>

      {/* Image Container with Link */}
      <Link href={`/produto/${product.slug}`} className="relative block aspect-[4/5] bg-neutral-100 overflow-hidden">
        <Image
          src={primaryImg}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      </Link>

      {/* Quick Size Bar (visible on card) */}
      {product.sizes && product.sizes.length > 0 && !isOutOfStock && (
        <div className="px-3 pt-2.5 flex items-center justify-between border-t border-neutral-50 bg-neutral-50/50">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Tamanhos:</span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {product.sizes.map((s) => {
              const isAvailable = Number(s.stock) > 0;
              return (
                <button
                  key={s.id || s.size}
                  disabled={!isAvailable}
                  onClick={(e) => handleQuickAdd(e, s.size, Number(s.stock))}
                  title={isAvailable ? `Adicionar tam. ${s.size} (${s.stock} un. em estoque)` : 'Tamanho esgotado'}
                  className={`text-[11px] font-semibold min-w-[26px] px-1.5 h-6 rounded flex items-center justify-center transition-all ${
                    !isAvailable
                      ? 'text-neutral-300 line-through cursor-not-allowed bg-neutral-100/50'
                      : selectedSize === s.size && addedNotice
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-800 hover:border-black hover:bg-black hover:text-white'
                  }`}
                >
                  {selectedSize === s.size && addedNotice ? <Check className="w-3 h-3" /> : s.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
          <span>{product.brand || product.team || 'Grife'}</span>
          <span>
            {calculatedTotalStock > 0 ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {calculatedTotalStock} un. disp.
              </span>
            ) : (
              <span className="text-[10px] font-bold text-neutral-400">Esgotado</span>
            )}
          </span>
        </div>

        <Link href={`/produto/${product.slug}`} className="group-hover:text-neutral-600 transition-colors">
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>

        {product.modelType && (
          <div className="mt-1">
            <span className="inline-block text-[10px] uppercase font-semibold tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
              {product.modelType === 'GRIFE'
                ? 'Grife de Luxo'
                : product.modelType === 'STREETWEAR'
                ? 'Streetwear Premium'
                : product.modelType === 'JOGADOR'
                ? 'Versão Jogador (Player)'
                : product.modelType === 'RETRO'
                ? 'Retrô Clássica'
                : product.modelType === 'POLO'
                ? 'Camisa Polo'
                : product.modelType === 'CAMISETA'
                ? 'Camiseta Casual 100% Algodão'
                : 'Manto Oficial'}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-neutral-900">
            {formatCurrency(effectivePrice)}
          </span>
          {product.promoPrice && (
            <span className="text-xs text-neutral-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        <div className="text-[11px] text-neutral-500 mt-0.5">
          ou até 10x de {formatCurrency(effectivePrice / 10)} sem juros
        </div>
      </div>
    </div>
  );
}

