'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { saveLocalSnapshot, markCatalogWiped } from '@/lib/clientStorage';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchProducts = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch(console.error)
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();

    // Live background polling every 5 seconds
    const interval = setInterval(() => {
      fetchProducts(true);
    }, 5000);

    const onFocus = () => fetchProducts(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [search, statusFilter]);

  const handleDuplicate = async (id: string, name: string) => {
    if (!confirm(`Deseja duplicar o produto "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionNotice(`Produto "${name}" duplicado com sucesso!`);
        fetchProducts();
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        alert(data.error || 'Erro ao duplicar produto');
      }
    } catch {
      alert('Erro ao duplicar');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;

    // Optimistic UI update: remove immediately from current view
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        if (data.snapshot) {
          await saveLocalSnapshot(data.snapshot);
          if (!data.snapshot.products || data.snapshot.products.length === 0) {
            markCatalogWiped();
          }
        }
        setActionNotice(data.message || 'Produto removido com sucesso.');
        fetchProducts();
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        alert(data.error || 'Erro ao excluir');
        fetchProducts();
      }
    } catch {
      alert('Erro ao excluir');
      fetchProducts();
    }
  };

  const handleZeroAllStock = async () => {
    if (!confirm('ATENÇÃO: Deseja ZERAR O ESTOQUE de TODOS os produtos do catálogo? Todas as quantidades serão definidas como 0.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zero_all_stock' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice(data.message || 'Todo o estoque foi zerado com sucesso!');
        fetchProducts();
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        alert(data.error || 'Erro ao zerar estoque');
      }
    } catch {
      alert('Erro ao zerar estoque');
    }
  };

  const handleWipeAllProducts = async () => {
    if (!confirm('PERIGO: Deseja EXCLUIR TODOS OS PRODUTOS do catálogo para começar a cadastrar tudo do zero?')) {
      return;
    }
    setProducts([]);
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wipe_products' }),
      });
      const data = await res.json();
      if (res.ok) {
        markCatalogWiped();
        setActionNotice(data.message || 'Catálogo limpo com sucesso! Loja pronta para começar do zero.');
        fetchProducts();
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        alert(data.error || 'Erro ao limpar catálogo');
        fetchProducts();
      }
    } catch {
      alert('Erro ao limpar catálogo');
      fetchProducts();
    }
  };

  const handleZeroProductStock = async (id: string, name: string) => {
    if (!confirm(`Deseja zerar o estoque do produto "${name}"?`)) return;
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zero_product_stock', productId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionNotice(data.message || `Estoque de "${name}" zerado!`);
        fetchProducts();
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        alert(data.error || 'Erro ao zerar estoque');
      }
    } catch {
      alert('Erro ao zerar estoque');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Catálogo de Produtos</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Gerenciamento de Produtos</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cadastre novos mantos, configure preços, custos de aquisição e fotos da galeria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllStock}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Define todas as quantidades de estoque de todos os produtos como 0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Zerar Estoques
          </button>
          <button
            onClick={handleWipeAllProducts}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exclui todos os produtos do catálogo para começar a cadastrar do zero"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Limpar Catálogo (Zerar Produtos)
          </button>
          <Link
            href="/admin/produtos/novo"
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Produto
          </Link>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-neutral-900 text-white text-xs font-medium rounded-xl animate-in fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, SKU, código de barras..."
            className="w-full px-3 py-1.5 pl-8 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-neutral-300 rounded-lg py-1.5 px-3 text-neutral-800 outline-none focus:border-black cursor-pointer shadow-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Apenas Ativos</option>
            <option value="inactive">Inativos / Arquivados</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">Carregando catálogo...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">Nenhum produto cadastrado com os filtros atuais.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">SKU / Categoria</th>
                  <th className="py-3.5 px-4">Custo</th>
                  <th className="py-3.5 px-4">Venda</th>
                  <th className="py-3.5 px-4">Margem %</th>
                  <th className="py-3.5 px-4 text-center">Estoque Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 bg-neutral-100 rounded overflow-hidden flex-shrink-0 border border-neutral-200">
                          <Image src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800'} alt={p.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-neutral-900 truncate max-w-xs">{p.name}</h4>
                          <span className="text-[10px] text-neutral-400">{p.brand || p.team || 'Grife'} {p.season ? `• ${p.season}` : ''}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-neutral-800 font-semibold block">{p.sku}</span>
                      <span className="text-[10px] text-neutral-400">{p.category?.name}</span>
                    </td>

                    <td className="py-3 px-4 text-neutral-600 font-mono">
                      {formatCurrency(p.acquisitionCost)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-neutral-900 block font-mono">
                        {formatCurrency(p.promoPrice || p.price)}
                      </span>
                      {p.promoPrice && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          {formatCurrency(p.price)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        +{p.profitMargin}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold font-mono ${p.totalStock === 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
                        {p.totalStock} un.
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/produto/${p.slug}`}
                          target="_blank"
                          className="p-1 text-neutral-400 hover:text-black transition-colors"
                          title="Ver na loja"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleZeroProductStock(p.id, p.name)}
                          className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
                          title="Zerar estoque deste produto"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/admin/produtos/${p.id}`}
                          className="p-1 text-neutral-600 hover:text-black transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(p.id, p.name)}
                          className="p-1 text-neutral-600 hover:text-black transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Excluir produto definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

