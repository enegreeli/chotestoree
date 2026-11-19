'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters State from URL or local
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({});
  const [availableSizes, setAvailableSizes] = useState<string[]>(['P', 'M', 'G', 'GG']);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Selected Filter States
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [selectedTeam, setSelectedTeam] = useState(searchParams.get('team') || '');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [selectedSeason, setSelectedSeason] = useState(searchParams.get('season') || '');
  const [selectedModel, setSelectedModel] = useState(searchParams.get('modelType') || '');
  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') || '');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('availableOnly') === 'true');
  const [promoOnly, setPromoOnly] = useState(searchParams.get('promo') === 'true');
  const [newOnly, setNewOnly] = useState(searchParams.get('newRelease') === 'true');
  const [bestOnly, setBestOnly] = useState(searchParams.get('bestSeller') === 'true');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '1000');

  // Load Categories & Global Counts
  const refreshGlobalData = () => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(console.error);

    fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setTotalCatalogCount(data.products.length);
          const bCounts: Record<string, number> = {};
          const mCounts: Record<string, number> = {};
          const sSet = new Set<string>();
          data.products.forEach((p: any) => {
            if (p.brand) {
              const b = p.brand.trim();
              bCounts[b] = (bCounts[b] || 0) + 1;
            }
            if (p.team) {
              const t = p.team.trim();
              bCounts[t] = (bCounts[t] || 0) + 1;
            }
            if (p.modelType) {
              mCounts[p.modelType] = (mCounts[p.modelType] || 0) + 1;
            }
            if (p.sizes && Array.isArray(p.sizes)) {
              p.sizes.forEach((s: any) => {
                if (s.size) sSet.add(s.size);
              });
            }
          });
          setBrandCounts(bCounts);
          setModelCounts(mCounts);
          if (sSet.size > 0) {
            setAvailableSizes(Array.from(sSet));
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    refreshGlobalData();
  }, []);

  // Fetch Products with filters
  useEffect(() => {
    const fetchCatalog = (isSilent = false) => {
      if (!isSilent) setLoading(true);
      refreshGlobalData();
      const params = new URLSearchParams();

      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedBrand) params.set('brand', selectedBrand);
      if (selectedTeam) params.set('team', selectedTeam);
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedSeason) params.set('season', selectedSeason);
      if (selectedModel) params.set('modelType', selectedModel);
      if (selectedSize) params.set('size', selectedSize);
      if (availableOnly) params.set('availableOnly', 'true');
      if (promoOnly) params.set('promo', 'true');
      if (newOnly) params.set('newRelease', 'true');
      if (bestOnly) params.set('bestSeller', 'true');
      if (searchQuery) params.set('q', searchQuery);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (sort) params.set('sort', sort);

      fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.products) {
            setProducts(data.products);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!isSilent) setLoading(false);
        });
    };

    fetchCatalog();

    // Live catalog stock & products polling every 3 seconds
    const interval = setInterval(() => {
      fetchCatalog(true);
    }, 3000);

    const onFocus = () => fetchCatalog(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [
    selectedCategory,
    selectedBrand,
    selectedTeam,
    selectedCountry,
    selectedSeason,
    selectedModel,
    selectedSize,
    availableOnly,
    promoOnly,
    newOnly,
    bestOnly,
    searchQuery,
    sort,
    maxPrice,
  ]);

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedTeam('');
    setSelectedCountry('');
    setSelectedSeason('');
    setSelectedModel('');
    setSelectedSize('');
    setAvailableOnly(false);
    setPromoOnly(false);
    setNewOnly(false);
    setBestOnly(false);
    setSearchQuery('');
    setMaxPrice('1000');
    setSort('newest');
    router.push('/produtos');
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedBrand) ||
    Boolean(selectedTeam) ||
    Boolean(selectedCountry) ||
    Boolean(selectedSeason) ||
    Boolean(selectedModel) ||
    Boolean(selectedSize) ||
    availableOnly ||
    promoOnly ||
    newOnly ||
    bestOnly ||
    Boolean(searchQuery) ||
    maxPrice !== '1000';

  const filterSidebar = (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">Categorias</h4>
        <div className="space-y-1.5 text-xs">
          <button
            onClick={() => setSelectedCategory('')}
            className={`w-full text-left py-1 px-2 rounded transition-colors flex items-center justify-between ${
              !selectedCategory ? 'font-bold bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'
            }`}
          >
            <span>Todas as Categorias</span>
            <span className="text-[10px] text-neutral-400">({totalCatalogCount})</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.slug ? '' : c.slug)}
              className={`w-full text-left py-1 px-2 rounded transition-colors flex items-center justify-between ${
                selectedCategory === c.slug ? 'font-bold bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>{c.name}</span>
              <span className="text-[10px] text-neutral-400">({c._count?.products ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand / Grife Filter */}
      <div className="pt-4 border-t border-neutral-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">Grifes & Marcas</h4>
        <div className="space-y-1.5 text-xs">
          <button
            onClick={() => setSelectedBrand('')}
            className={`w-full text-left py-1 px-2 rounded transition-colors flex items-center justify-between ${
              !selectedBrand ? 'font-bold bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'
            }`}
          >
            <span>Todas as Marcas</span>
            <span className="text-[10px] text-neutral-400">({totalCatalogCount})</span>
          </button>
          {Object.keys(brandCounts)
            .filter((b) => brandCounts[b] > 0 && b === b.trim())
            .sort()
            .map((bName) => (
              <button
                key={bName}
                onClick={() => setSelectedBrand(selectedBrand === bName ? '' : bName)}
                className={`w-full text-left py-1 px-2 rounded transition-colors flex items-center justify-between ${
                  selectedBrand === bName ? 'font-bold bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>{bName}</span>
                <span className="text-[10px] text-neutral-400">({brandCounts[bName] || 0})</span>
              </button>
            ))}
        </div>
      </div>

      {/* Model Type */}
      <div className="pt-4 border-t border-neutral-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">Linha & Modelo</h4>
        <div className="space-y-1.5 text-xs">
          {[
            { label: 'Todas as Linhas', value: '', count: totalCatalogCount },
            { label: 'Grifes de Luxo (Designer)', value: 'GRIFE', count: modelCounts['GRIFE'] || 0 },
            { label: 'Streetwear Premium', value: 'STREETWEAR', count: modelCounts['STREETWEAR'] || 0 },
            { label: 'Versão Jogador (Authentic)', value: 'JOGADOR', count: modelCounts['JOGADOR'] || 0 },
            { label: 'Versão Torcedor (Fan)', value: 'TORCEDOR', count: modelCounts['TORCEDOR'] || 0 },
            { label: 'Camisas Polo', value: 'POLO', count: modelCounts['POLO'] || 0 },
            { label: 'Camisetas Casuais (T-Shirts)', value: 'CAMISETA', count: modelCounts['CAMISETA'] || 0 },
            { label: 'Edição Retrô Histórica', value: 'RETRO', count: modelCounts['RETRO'] || 0 },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedModel(selectedModel === m.value ? '' : m.value)}
              className={`w-full text-left py-1 px-2 rounded transition-colors flex items-center justify-between ${
                selectedModel === m.value ? 'font-bold bg-neutral-100 text-black' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>{m.label}</span>
              <span className="text-[10px] text-neutral-400">({m.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size Filter */}
      <div className="pt-4 border-t border-neutral-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">Tamanho</h4>
        <div className="grid grid-cols-4 gap-2">
          {availableSizes.map((sz) => (
            <button
              key={sz}
              onClick={() => setSelectedSize(selectedSize === sz ? '' : sz)}
              className={`h-9 rounded border text-xs font-bold uppercase transition-all ${
                selectedSize === sz
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-800 border-neutral-200 hover:border-black'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Price Slider */}
      <div className="pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Preço Máximo</h4>
          <span className="text-xs font-bold text-neutral-900">Até R$ {maxPrice}</span>
        </div>
        <input
          type="range"
          min="100"
          max="1000"
          step="25"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full accent-black cursor-pointer"
        />
      </div>

      {/* Checkbox Options */}
      <div className="pt-4 border-t border-neutral-100 space-y-2.5">
        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="rounded border-neutral-300 text-black focus:ring-0"
          />
          <span>Apenas em estoque</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={promoOnly}
            onChange={(e) => setPromoOnly(e.target.checked)}
            className="rounded border-neutral-300 text-black focus:ring-0"
          />
          <span>Somente promoções</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={newOnly}
            onChange={(e) => setNewOnly(e.target.checked)}
            className="rounded border-neutral-300 text-black focus:ring-0"
          />
          <span>Lançamentos</span>
        </label>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Limpar Filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header and Sorting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Coleções Oficiais & Designer</span>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Catálogo Geral & Grifes</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {loading ? 'Carregando produtos...' : `${products.length} modelo(s) encontrado(s)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-800"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {hasActiveFilters && '•'}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:inline">Ordenar por:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg py-2 px-3 text-neutral-900 outline-none focus:border-black cursor-pointer"
            >
              <option value="newest">Mais Recentes</option>
              <option value="best-sellers">Mais Vendidos</option>
              <option value="price-asc">Menor Preço</option>
              <option value="price-desc">Maior Preço</option>
              <option value="name-asc">Nome (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 pr-6 border-r border-neutral-100">
          {filterSidebar}
        </aside>

        {/* Mobile Filters Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
            <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Filtros</h3>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="w-5 h-5 text-neutral-500" />
                  </button>
                </div>
                {filterSidebar}
              </div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-6 w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg"
              >
                Ver Resultados ({products.length})
              </button>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[4/5] bg-neutral-100 rounded-xl" />
                  <div className="h-4 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100 p-8">
              <p className="text-base font-bold text-neutral-800">Nenhum manto encontrado com estes filtros</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Tente redefinir os filtros de preço, categoria ou tamanho para visualizar outros mantos disponíveis.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-6 px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-neutral-400">Carregando catálogo...</div>}>
      <CatalogContent />
    </Suspense>
  );
}

