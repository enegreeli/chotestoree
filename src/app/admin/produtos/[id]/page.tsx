'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import ImageUploader from '@/components/ImageUploader';
import { saveLocalSnapshot } from '@/lib/clientStorage';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('');
  const [season, setSeason] = useState('');
  const [modelType, setModelType] = useState('GRIFE');
  const [supplier, setSupplier] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('0');
  const [price, setPrice] = useState('0');
  const [promoPrice, setPromoPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewRelease, setIsNewRelease] = useState(false);
  const [isPromo, setIsPromo] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [newSizeInput, setNewSizeInput] = useState('');

  const addCustomSize = () => {
    const trimmed = newSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (sizes.some((s) => s.size.toUpperCase() === trimmed)) {
      alert(`O tamanho ${trimmed} já existe na lista.`);
      return;
    }
    setSizes([...sizes, { size: trimmed, stock: '5', minStock: '2' }]);
    setNewSizeInput('');
  };

  const removeSize = (idx: number) => {
    if (sizes.length <= 1) {
      alert('O produto precisa ter pelo menos 1 tamanho.');
      return;
    }
    setSizes(sizes.filter((_, i) => i !== idx));
  };

  const applyPreset = (type: 'roupas' | 'calcas' | 'calcados' | 'unico') => {
    if (type === 'roupas') {
      setSizes([
        { size: 'P', stock: '5', minStock: '2' },
        { size: 'M', stock: '5', minStock: '2' },
        { size: 'G', stock: '5', minStock: '2' },
        { size: 'GG', stock: '5', minStock: '2' },
      ]);
    } else if (type === 'calcas') {
      setSizes([
        { size: '36', stock: '5', minStock: '2' },
        { size: '38', stock: '5', minStock: '2' },
        { size: '40', stock: '5', minStock: '2' },
        { size: '42', stock: '5', minStock: '2' },
        { size: '44', stock: '5', minStock: '2' },
        { size: '46', stock: '5', minStock: '2' },
      ]);
    } else if (type === 'calcados') {
      setSizes([
        { size: '38', stock: '5', minStock: '2' },
        { size: '39', stock: '5', minStock: '2' },
        { size: '40', stock: '5', minStock: '2' },
        { size: '41', stock: '5', minStock: '2' },
        { size: '42', stock: '5', minStock: '2' },
        { size: '43', stock: '5', minStock: '2' },
      ]);
    } else if (type === 'unico') {
      setSizes([
        { size: 'UN', stock: '10', minStock: '2' },
      ]);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch(`/api/admin/products/${id}`).then((r) => r.json()),
    ])
      .then(([catsData, prodData]) => {
        if (catsData.categories) setCategories(catsData.categories);

        if (prodData.product) {
          const p = prodData.product;
          setName(p.name);
          setSku(p.sku);
          setBarcode(p.barcode || '');
          setCategoryId(p.categoryId);
          setBrand(p.brand || '');
          setTeam(p.team || '');
          setCountry(p.country || '');
          setSeason(p.season || '');
          setModelType(p.modelType || 'GRIFE');
          setSupplier(p.supplier || '');
          setAcquisitionCost(p.acquisitionCost.toString());
          setPrice(p.price.toString());
          setPromoPrice(p.promoPrice ? p.promoPrice.toString() : '');
          setDescription(p.description || '');
          setIsActive(p.isActive);
          setIsFeatured(p.isFeatured);
          setIsBestSeller(p.isBestSeller);
          setIsNewRelease(p.isNewRelease);
          setIsPromo(p.isPromo);

          if (p.images && p.images.length > 0) {
            setImages(p.images.map((i: any) => i.url));
          } else {
            setImages(['https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800']);
          }

          if (p.sizes && p.sizes.length > 0) {
            setSizes(p.sizes.map((s: any) => ({ size: s.size, stock: s.stock.toString(), minStock: s.minStock.toString() })));
          } else {
            setSizes([
              { size: 'P', stock: '0', minStock: '2' },
              { size: 'M', stock: '0', minStock: '2' },
              { size: 'G', stock: '0', minStock: '2' },
              { size: 'GG', stock: '0', minStock: '2' },
            ]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const costNum = parseFloat(acquisitionCost) || 0;
  const priceNum = parseFloat(promoPrice || price) || 0;
  const profitMargin = priceNum > 0 ? (((priceNum - costNum) / priceNum) * 100).toFixed(1) : '0';
  const profitValue = Math.max(0, priceNum - costNum);

  const addImageField = () => setImages([...images, '']);
  const updateImage = (idx: number, val: string) => {
    const copy = [...images];
    copy[idx] = val;
    setImages(copy);
  };
  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  const updateSize = (idx: number, field: string, val: string) => {
    const copy = [...sizes];
    (copy[idx] as any)[field] = val;
    setSizes(copy);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : `CK-${Date.now().toString(36).toUpperCase()}`;
    const finalCategory = categoryId || categories[0]?.id || '';

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sku: finalSku,
          barcode,
          categoryId: finalCategory,
          brand,
          team,
          country,
          season,
          modelType,
          supplier,
          acquisitionCost: parseFloat(acquisitionCost) || 0,
          price: parseFloat(price),
          promoPrice: promoPrice ? parseFloat(promoPrice) : null,
          description,
          isActive,
          isFeatured,
          isBestSeller,
          isNewRelease,
          isPromo,
          images: images.filter((img) => img.trim().length > 0),
          sizes: sizes.map((s) => ({
            size: s.size,
            stock: parseInt(s.stock, 10) || 0,
            minStock: parseInt(s.minStock, 10) || 2,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar produto');
      }

      // 100% Local: Save snapshot immediately to IndexedDB and localStorage
      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      setSuccess('✓ Alterações salvas com sucesso no armazenamento local!');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleZeroThisStock = async () => {
    if (!confirm('Deseja zerar o estoque de todos os tamanhos deste produto?')) return;
    const zeroed = sizes.map((s) => ({ ...s, stock: '0' }));
    setSizes(zeroed);
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zero_product_stock', productId: id }),
      });
      if (res.ok) {
        setSuccess('Estoque deste produto zerado com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      // Local state is already 0
    }
  };

  const handleDeleteThisProduct = async () => {
    if (!confirm(`Deseja realmente EXCLUIR DEFINITIVAMENTE o produto "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/produtos');
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao excluir produto');
      }
    } catch {
      alert('Erro ao excluir produto');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-neutral-500">Carregando produto para edição...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <Link
            href="/admin/produtos"
            className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Produtos
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Editar Manto</h1>
          <p className="text-xs text-neutral-500">SKU: {sku}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZeroThisStock}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Define o estoque de todos os tamanhos deste produto como 0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Zerar Estoque
          </button>
          <button
            type="button"
            onClick={handleDeleteThisProduct}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exclui este produto permanentemente"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Excluir Produto
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Basic Info */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            1. Informações Básicas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Nome do Manto *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Código SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black uppercase font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Código de Barras (EAN)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Categoria *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Marca / Grife</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Lacoste, Hugo Boss, Ralph Lauren, Tommy Hilfiger, Balenciaga..."
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Time / Clube / Parceria (Opcional)</label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ex: Real Madrid, Flamengo (ou deixe vazio para Grife)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">País</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Espanha, França, Brasil, EUA..."
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Temporada / Coleção</label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2024/2025 ou Verão 2025"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Linha / Modelo</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
              >
                <option value="GRIFE">Grife de Luxo (Designer)</option>
                <option value="STREETWEAR">Streetwear Premium</option>
                <option value="POLO">Camisa Polo (Viagem / Casual)</option>
                <option value="CAMISETA">Camiseta Casual (100% Algodão)</option>
                <option value="TORCEDOR">Versão Torcedor (Fan)</option>
                <option value="JOGADOR">Versão Jogador (Authentic)</option>
                <option value="RETRO">Edição Retrô Histórica</option>
                <option value="EDICAO_ESPECIAL">Edição Especial / Collab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Fornecedor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Descrição</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Profit Margin */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            2. Precificação & Margem de Lucro
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Custo de Aquisição (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Preço Promocional (R$)</label>
              <input
                type="number"
                step="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono text-emerald-700"
              />
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-neutral-500 uppercase">Cálculo de Lucro Líquido:</span>
              <p className="text-xs text-neutral-700 mt-0.5">
                Lucro por unidade vendida: <span className="font-bold text-neutral-900">{formatCurrency(profitValue)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Margem Bruta:</span>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black">
                {profitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* Sizes and Stock */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                3. Controle de Tamanhos & Estoque Sincronizado
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Defina os tamanhos e as quantidades em estoque. O site apresentará exatamente o que estiver configurado aqui.
              </p>
            </div>
            {/* Stock Bulk Presets */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <span className="text-[10px] font-bold text-neutral-400 uppercase mr-1">Preencher:</span>
              <button
                type="button"
                onClick={() => setSizes(sizes.map((s) => ({ ...s, stock: '0' })))}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100"
              >
                Zerar (0 un.)
              </button>
              <button
                type="button"
                onClick={() => setSizes(sizes.map((s) => ({ ...s, stock: '5' })))}
                className="px-2.5 py-1 text-[11px] font-bold bg-neutral-100 text-neutral-800 rounded-md hover:bg-neutral-200"
              >
                5 un. cada
              </button>
              <button
                type="button"
                onClick={() => setSizes(sizes.map((s) => ({ ...s, stock: '10' })))}
                className="px-2.5 py-1 text-[11px] font-bold bg-neutral-100 text-neutral-800 rounded-md hover:bg-neutral-200"
              >
                10 un. cada
              </button>
              <button
                type="button"
                onClick={() => setSizes(sizes.map((s) => ({ ...s, stock: '20' })))}
                className="px-2.5 py-1 text-[11px] font-bold bg-neutral-100 text-neutral-800 rounded-md hover:bg-neutral-200"
              >
                20 un. cada
              </button>
            </div>
          </div>

          {/* Type Presets (Camisas vs Calças vs Calçados vs Único) */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-600 uppercase">Modelos Rápidos:</span>
            <button
              type="button"
              onClick={() => applyPreset('roupas')}
              className="px-3 py-1 bg-white border border-neutral-200 hover:border-black rounded-lg text-xs font-semibold text-neutral-800 shadow-sm transition-all"
            >
              👕 Camisas / Polos (P, M, G, GG)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('calcas')}
              className="px-3 py-1 bg-white border border-neutral-200 hover:border-black rounded-lg text-xs font-semibold text-neutral-800 shadow-sm transition-all"
            >
              👖 Calças / Bermudas (36 a 46)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('calcados')}
              className="px-3 py-1 bg-white border border-neutral-200 hover:border-black rounded-lg text-xs font-semibold text-neutral-800 shadow-sm transition-all"
            >
              👟 Calçados (38 a 43)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('unico')}
              className="px-3 py-1 bg-white border border-neutral-200 hover:border-black rounded-lg text-xs font-semibold text-neutral-800 shadow-sm transition-all"
            >
              🧢 Tamanho Único (UN)
            </button>
          </div>

          {/* Add Custom Size Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSizeInput}
              onChange={(e) => setNewSizeInput(e.target.value)}
              placeholder="Adicionar tamanho customizado (Ex: 48, 2GG, Infantil...)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSize();
                }
              }}
              className="flex-1 max-w-sm px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-medium"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Tamanho
            </button>
          </div>

          {/* Dynamic Sizes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {sizes.map((s, idx) => (
              <div key={`${s.size}-${idx}`} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 relative group hover:border-neutral-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-neutral-900">
                    Tam. {s.size}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSize(idx)}
                    title="Excluir este tamanho"
                    className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={s.stock}
                    onChange={(e) => updateSize(idx, 'stock', e.target.value)}
                    className="w-full px-2 py-1 text-xs font-bold border border-neutral-300 rounded-lg font-mono outline-none focus:border-black text-center bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={s.minStock}
                    onChange={(e) => updateSize(idx, 'minStock', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-lg font-mono outline-none focus:border-black text-center bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              4. Fotos do Produto
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Escolha imagens direto do seu computador ou celular. A foto com a estrela será a capa principal.
            </p>
          </div>

          <ImageUploader images={images} onChange={setImages} maxImages={8} />
        </div>

        {/* Visibility */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
            5. Status e Destaques
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-black"
              />
              <span>Ativo no Site</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={isNewRelease}
                onChange={(e) => setIsNewRelease(e.target.checked)}
                className="accent-black"
              />
              <span>Lançamento</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="accent-black"
              />
              <span>Mais Vendido</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="accent-black"
              />
              <span>Destaque Home</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin/produtos"
            className="px-6 py-3 border border-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Voltar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {saving ? 'Atualizando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

