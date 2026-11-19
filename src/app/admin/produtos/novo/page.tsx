'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import ImageUploader from '@/components/ImageUploader';
import { saveLocalSnapshot } from '@/lib/clientStorage';

export default function NewProductPage() {
  const router = useRouter();

  // Categories and Quick Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [quickCatName, setQuickCatName] = useState('');
  const [showQuickCat, setShowQuickCat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [season, setSeason] = useState('2024/2025');
  const [modelType, setModelType] = useState('GRIFE');
  const [supplier, setSupplier] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('0');
  const [price, setPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewRelease, setIsNewRelease] = useState(true);
  const [isPromo, setIsPromo] = useState(false);

  // Photos (PC, Celular ou Link)
  const [images, setImages] = useState<string[]>([]);

  // Sizes and individual stock - starts clean at 0
  const [sizes, setSizes] = useState([
    { size: 'P', stock: '0', minStock: '2' },
    { size: 'M', stock: '0', minStock: '2' },
    { size: 'G', stock: '0', minStock: '2' },
    { size: 'GG', stock: '0', minStock: '2' },
  ]);

  const handleCreateQuickCategory = async () => {
    if (!quickCatName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCatName.trim(),
          slug: quickCatName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-'),
          sortOrder: categories.length + 1,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategories((prev) => [...prev, data.category]);
        setCategoryId(data.category.id);
        setQuickCatName('');
        setShowQuickCat(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setCategoryId(data.categories[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Profit Margin Calculation
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !price) {
      setError('Preencha pelo menos o Nome e o Preço do produto.');
      return;
    }

    const finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : `CK-${Date.now().toString(36).toUpperCase()}`;
    const finalCategory = categoryId || categories[0]?.id || '';

    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
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
        throw new Error(data.error || 'Erro ao cadastrar produto');
      }

      // 100% Local: Save snapshot immediately to IndexedDB and localStorage
      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      setSuccess('✓ Produto cadastrado e gravado com sucesso no armazenamento local!');
      setTimeout(() => {
        router.push('/admin/produtos');
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar produto.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div>
          <Link
            href="/admin/produtos"
            className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Produtos
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Cadastrar Novo Produto</h1>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Ex: Camisa Real Madrid Home 24/25 Authentic"
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
                placeholder="RMA-HOM-2425-01"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black uppercase font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Código de Barras (EAN)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="7891234567890"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">Categoria *</label>
                <button
                  type="button"
                  onClick={() => setShowQuickCat(!showQuickCat)}
                  className="text-[11px] font-bold text-neutral-600 hover:text-black underline"
                >
                  {showQuickCat ? 'Cancelar' : '+ Nova Categoria'}
                </button>
              </div>

              {showQuickCat && (
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    value={quickCatName}
                    onChange={(e) => setQuickCatName(e.target.value)}
                    placeholder="Nome da nova categoria..."
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={handleCreateQuickCategory}
                    className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-black"
                  >
                    Salvar
                  </button>
                </div>
              )}

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
              >
                {categories.length === 0 && (
                  <option value="">Geral (Padrão)</option>
                )}
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Fornecedor / Fabricante</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Adidas Global, Nike Brasil..."
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Descrição Detalhada</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o tecido, detalhes de gola, tecnologias (Heat.Rdy, Dri-Fit ADV), selos comemorativos..."
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Profit Margin Calculator */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            2. Precificação & Margem de Lucro Automática
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Custo de Aquisição (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                placeholder="120.00"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono font-semibold"
              />
              <span className="text-[10px] text-neutral-400">Quanto você paga ao fornecedor</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Preço de Venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="349.90"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono font-bold"
              />
              <span className="text-[10px] text-neutral-400">Preço cheio exibido na loja</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Preço Promocional (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                placeholder="Opcional (ex: 299.90)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono text-emerald-700"
              />
              <span className="text-[10px] text-neutral-400">Se preenchido, ativa o selo de oferta</span>
            </div>
          </div>

          {/* Dynamic Profit Margin Badge */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-neutral-500 uppercase">Cálculo Automático de Lucro:</span>
              <p className="text-xs text-neutral-700 mt-0.5">
                Lucro estimado por peça vendida:{' '}
                <span className="font-bold text-neutral-900">{formatCurrency(profitValue)}</span>
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
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                3. Controle de Estoque por Tamanho (P, M, G, GG)
              </h2>
              <p className="text-xs text-neutral-500">
                Defina o estoque inicial de cada tamanho.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSizes(sizes.map((s) => ({ ...s, stock: '0' })))}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100"
              >
                Zerar Todos (0 un.)
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {sizes.map((s, idx) => (
              <div key={s.size} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <span className="text-sm font-black text-neutral-900 block text-center">
                  Tamanho {s.size}
                </span>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">
                    Estoque Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={s.stock}
                    onChange={(e) => updateSize(idx, 'stock', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold border border-neutral-300 rounded-lg font-mono outline-none focus:border-black text-center"
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
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg font-mono outline-none focus:border-black text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photos / Gallery */}
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

        {/* Status Switches */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
            5. Visibilidade & Destaques
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
              <span>Selo Lançamento</span>
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

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin/produtos"
            className="px-6 py-3 border border-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {loading ? 'Salvando...' : 'Salvar e Publicar Manto'}
          </button>
        </div>
      </form>
    </div>
  );
}

