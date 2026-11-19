'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Boxes,
  Plus,
  Minus,
  Edit,
  History,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  CheckCircle,
  X,
  ArrowRight,
  TrendingUp,
  Zap,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { saveLocalSnapshot, markCatalogWiped } from '@/lib/clientStorage';

function InventoryManagementContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter); // 'all', 'low', 'out'
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Modal State for Movement
  const [activeModal, setActiveModal] = useState<{
    product: any;
    sizeObj: any;
  } | null>(null);

  const [movementType, setMovementType] = useState('ENTRADA'); // ENTRADA, SAIDA_AVARIA, SAIDA_PERDA, DEVOLUCAO, AJUSTE
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [minStockInput, setMinStockInput] = useState('2');
  const [submitting, setSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleZeroAllStock = async () => {
    if (!confirm('ATENÇÃO: Deseja realmente ZERAR O ESTOQUE de TODOS os produtos da loja? Todos os tamanhos ficarão com 0 unidades.')) {
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
        setActionFeedback(data.message || 'Todo o estoque foi zerado com sucesso!');
        fetchInventory();
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        alert(data.error || 'Erro ao zerar estoque');
      }
    } catch {
      alert('Erro de conexão ao zerar estoque');
    }
  };

  const handleWipeAllProducts = async () => {
    if (!confirm('PERIGO: Deseja EXCLUIR TODOS OS PRODUTOS do catálogo para começar a loja do zero? Todos os produtos e estoques serão removidos permanentemente.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wipe_products' }),
      });
      const data = await res.json();
      if (res.ok) {
        markCatalogWiped();
        setActionFeedback(data.message || 'Catálogo limpo com sucesso! Loja pronta para começar do zero.');
        fetchInventory();
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        alert(data.error || 'Erro ao limpar catálogo');
      }
    } catch {
      alert('Erro de conexão ao limpar catálogo');
    }
  };

  const handleZeroProductStock = async (prodId: string, prodName: string) => {
    if (!confirm(`Deseja zerar o estoque de todos os tamanhos de "${prodName}"?`)) return;
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'zero_product_stock', productId: prodId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(data.message || `Estoque de "${prodName}" zerado!`);
        fetchInventory();
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        alert(data.error || 'Erro ao zerar estoque');
      }
    } catch {
      alert('Erro ao zerar estoque');
    }
  };

  const handleDeleteProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`Deseja EXCLUIR DEFINITIVAMENTE o produto "${prodName}" da loja?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${prodId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        if (data.snapshot) {
          await saveLocalSnapshot(data.snapshot);
        }
        setActionFeedback(`Produto "${prodName}" excluído com sucesso!`);
        fetchInventory();
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        alert(data.error || 'Erro ao excluir produto');
      }
    } catch {
      alert('Erro ao excluir produto');
    }
  };

  const fetchInventory = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (search) params.set('search', search);

    fetch(`/api/admin/inventory?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.inventory) {
          setInventory(data.inventory);
          setLastSync(new Date());
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchInventory();

    // Auto-refresh in real-time every 3.5 seconds
    const interval = setInterval(() => {
      if (!activeModal) {
        fetchInventory(true);
      }
    }, 3500);

    const handleFocus = () => fetchInventory(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filter, search, activeModal]);

  const openMovementModal = (product: any, sizeObj: any) => {
    setActiveModal({ product, sizeObj });
    setMovementType('ENTRADA');
    setQuantity('1');
    setReason('');
    setMinStockInput(sizeObj.minStock.toString());
    setModalFeedback(null);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;

    setSubmitting(true);
    setModalFeedback(null);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeModal.product.id,
          sizeStockId: activeModal.sizeObj.id,
          size: activeModal.sizeObj.size,
          type: movementType,
          quantity: parseInt(quantity, 10),
          reason: reason || `${movementType} registrada no painel`,
          newMinStock: parseInt(minStockInput, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar movimentação');
      }

      setModalFeedback({ text: 'Estoque atualizado com sucesso!', error: false });
      setTimeout(() => {
        setActiveModal(null);
        fetchInventory();
      }, 1200);
    } catch (err: any) {
      setModalFeedback({ text: err.message || 'Erro ao salvar', error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Controle Operacional</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Estoque por Produto e Tamanho</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Sincronização ao vivo com cada compra, baixa ou cancelamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllStock}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Define todas as quantidades de estoque de todos os produtos como 0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Zerar Todo o Estoque
          </button>
          <button
            onClick={handleWipeAllProducts}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exclui todos os produtos do catálogo para começar a cadastrar do zero"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Limpar Catálogo (Zerar Produtos)
          </button>
          <Link
            href="/admin/estoque/movimentacoes"
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 hover:bg-neutral-100 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-neutral-500" /> Histórico
          </Link>
          <Link
            href="/admin/produtos/novo"
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Produto
          </Link>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 bg-neutral-900 text-white text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-2 shadow-md">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos os Produtos' },
            { id: 'low', label: 'Estoque Baixo ⚠️' },
            { id: 'out', label: 'Sem Estoque (Esgotados)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, SKU, grife ou time..."
            className="w-full px-3 py-1.5 pl-8 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">Carregando estoque dos produtos...</div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">Nenhum produto encontrado com estes filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Produto & SKU</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4 text-center">Tamanho P</th>
                  <th className="py-3.5 px-4 text-center">Tamanho M</th>
                  <th className="py-3.5 px-4 text-center">Tamanho G</th>
                  <th className="py-3.5 px-4 text-center">Tamanho GG</th>
                  <th className="py-3.5 px-4 text-center">Total Geral</th>
                  <th className="py-3.5 px-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {inventory.map((prod) => (
                  <tr key={prod.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Product & SKU */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 bg-neutral-100 rounded overflow-hidden flex-shrink-0 border border-neutral-200">
                          <Image src={prod.image} alt={prod.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-neutral-900 truncate max-w-xs">{prod.name}</h4>
                          <p className="text-[11px] text-neutral-400">SKU: {prod.sku} • {prod.brand || prod.team || 'Grife'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-neutral-600 font-medium">{prod.category}</td>

                    {/* Sizes Individual stock buttons */}
                    {['P', 'M', 'G', 'GG'].map((szName) => {
                      const szObj = prod.sizes.find((s: any) => s.size === szName);
                      if (!szObj) {
                        return (
                          <td key={szName} className="py-3 px-4 text-center text-neutral-300 font-mono">
                            -
                          </td>
                        );
                      }

                      const isOut = szObj.stock === 0;
                      const isLow = szObj.stock > 0 && szObj.stock <= szObj.minStock;

                      return (
                        <td key={szName} className="py-3 px-4 text-center">
                          <button
                            onClick={() => openMovementModal(prod, szObj)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              isOut
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                : isLow
                                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-black'
                            }`}
                            title={`Clique para movimentar o tamanho ${szName} (Mínimo: ${szObj.minStock})`}
                          >
                            <span>{szObj.stock} un.</span>
                            {isLow && <span className="block text-[9px] text-amber-700 font-normal">Baixo</span>}
                            {isOut && <span className="block text-[9px] text-rose-700 font-normal">Esgotado</span>}
                          </button>
                        </td>
                      );
                    })}

                    {/* Total Stock */}
                    <td className="py-3 px-4 text-center font-black text-neutral-900">
                      {prod.totalStock} un.
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleZeroProductStock(prod.id, prod.name)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Zerar estoque deste produto"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/admin/produtos/${prod.id}`}
                          className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
                          title="Editar detalhes e fotos do produto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Excluir produto da loja"
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

      {/* Movement Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Movimentação de Estoque</span>
                <h3 className="text-base font-bold text-neutral-900">{activeModal.product.name}</h3>
                <p className="text-xs text-neutral-500">
                  Tamanho: <span className="font-bold text-neutral-800">{activeModal.sizeObj.size}</span> • Estoque Atual: <span className="font-bold text-neutral-800">{activeModal.sizeObj.stock} unidades</span>
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  modalFeedback.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {modalFeedback.text}
              </div>
            )}

            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Tipo de Movimentação</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
                >
                  <option value="ENTRADA">📦 Entrada de Mercadoria (Adicionar unidades)</option>
                  <option value="SAIDA_AVARIA">⚠️ Saída por Avaria / Defeito (Subtrair unidades)</option>
                  <option value="SAIDA_PERDA">❌ Saída por Perda / Extravio (Subtrair unidades)</option>
                  <option value="DEVOLUCAO">🔄 Devolução de Cliente (Adicionar unidades)</option>
                  <option value="AJUSTE">🔧 Ajuste de Inventário Físico (Definir valor absoluto)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {movementType === 'AJUSTE' ? 'Novo Estoque Total' : 'Quantidade a Movimentar'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Motivo / Observações</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Recebimento lote reposição distribuidor..."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Confirmar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-neutral-500">Carregando estoque...</div>}>
      <InventoryManagementContent />
    </Suspense>
  );
}

