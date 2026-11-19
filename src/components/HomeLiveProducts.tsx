'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Flame, ChevronRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

interface HomeLiveProductsProps {
  initialAllProducts: any[];
  initialNewReleases: any[];
  initialBestSellers: any[];
  initialPromo: any[];
  initialLuxury: any[];
}

export default function HomeLiveProducts({
  initialAllProducts,
  initialNewReleases,
  initialBestSellers,
  initialPromo,
  initialLuxury,
}: HomeLiveProductsProps) {
  const [allProducts, setAllProducts] = useState<any[]>(initialAllProducts);
  const [newReleases, setNewReleases] = useState<any[]>(initialNewReleases);
  const [bestSellers, setBestSellers] = useState<any[]>(initialBestSellers);
  const [promoProducts, setPromoProducts] = useState<any[]>(initialPromo);
  const [luxuryProducts, setLuxuryProducts] = useState<any[]>(initialLuxury);
  const [isLiveSynced, setIsLiveSynced] = useState(true);

  const fetchLiveProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      if (!data.products) return;

      const items: any[] = data.products;

      // 1. All active products (sorted newest first)
      const sortedAll = [...items].sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setAllProducts(sortedAll.slice(0, 12));

      // 2. New Releases
      const releases = items.filter((p) => p.isNewRelease || p.isFeatured);
      setNewReleases(releases.slice(0, 4));

      // 3. Best Sellers
      const best = items.filter((p) => p.isBestSeller);
      setBestSellers(best.slice(0, 4));

      // 4. Promo Products
      const promos = items.filter((p) => p.isPromo || (p.promoPrice && p.promoPrice < p.price));
      setPromoProducts(promos.slice(0, 4));

      // 5. Luxury & Streetwear
      const lux = items.filter(
        (p) =>
          p.modelType === 'GRIFE' ||
          p.modelType === 'STREETWEAR' ||
          p.category?.slug === 'grifes-luxo' ||
          p.category?.slug === 'streetwear'
      );
      setLuxuryProducts(lux.slice(0, 4));
      setIsLiveSynced(true);
    } catch (err) {
      console.warn('Home live sync error:', err);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchLiveProducts();

    // Auto-refresh every 4 seconds to reflect any newly created, edited, or deleted product
    const interval = setInterval(fetchLiveProducts, 4000);

    // Instant refresh when user returns to the tab
    const onFocus = () => fetchLiveProducts();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <div className="space-y-16">
      {/* 1. COLEÇÃO PRINCIPAL & NOVIDADES */}
      {allProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700 font-semibold tracking-wider">Estoque Sincronizado ao Vivo</span>
                <span className="text-neutral-300">•</span>
                <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                Catálogo Oficial & Novidades
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">
                Coleção em Destaque & Pronta Entrega
              </h2>
            </div>
            <Link
              href="/produtos"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
            >
              Ver Catálogo Completo ({allProducts.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 2. MAIS VENDIDOS */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400">
                <Flame className="w-4 h-4 text-rose-500" />
                Os Mantos Mais Procurados
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">Mais Vendidos</h2>
            </div>
            <Link
              href="/produtos?bestSeller=true"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
            >
              Ver Todos ({bestSellers.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 3. GRIFES DE LUXO & STREETWEAR */}
      {luxuryProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400">
                <Sparkles className="w-4 h-4 text-neutral-900" />
                Alta Moda & Estilo Urbano
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">Grifes de Luxo & Streetwear</h2>
            </div>
            <Link
              href="/produtos?category=grifes-luxo"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
            >
              Ver Todas as Grifes ({luxuryProducts.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {luxuryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 4. LANÇAMENTOS */}
      {newReleases.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400">
                <Sparkles className="w-4 h-4 text-neutral-700" />
                Recém-Chegados
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">Lançamentos da Temporada</h2>
            </div>
            <Link
              href="/produtos?newRelease=true"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
            >
              Ver Todos ({newReleases.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {newReleases.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 5. OFERTAS & PROMOÇÕES */}
      {promoProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 border-b border-neutral-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-rose-600">Preços Especiais</span>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">Ofertas Imperdíveis</h2>
            </div>
            <Link
              href="/produtos?promo=true"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-1"
            >
              Ver Todas as Ofertas ({promoProducts.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {promoProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
