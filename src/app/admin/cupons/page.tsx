'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { saveLocalSnapshot } from '@/lib/clientStorage';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Coupon Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE'); // PERCENTAGE, FIXED, FREE_SHIPPING
  const [discountValue, setDiscountValue] = useState('10');
  const [minPurchaseValue, setMinPurchaseValue] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCoupons = () => {
    setLoading(true);
    fetch('/api/admin/coupons')
      .then((res) => res.json())
      .then((data) => {
        if (data.coupons) setCoupons(data.coupons);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggleActive = async (coupon: any) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = await res.json();
      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }
      fetchCoupons();
    } catch {
      alert('Erro ao alterar status do cupom');
    }
  };

  const handleDelete = async (id: string, cCode: string) => {
    if (!confirm(`Excluir permanentemente o cupom ${cCode}?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }
      fetchCoupons();
    } catch {
      alert('Erro ao excluir');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue) || 0,
          minPurchaseValue: parseFloat(minPurchaseValue) || 0,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: expiresAt || null,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar cupom');
      }

      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      setModalOpen(false);
      setCode('');
      setMaxUses('');
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cupom');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Marketing & Vendas</span>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Cupons de Desconto & Promoções</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Crie regras de desconto percentual, valor fixo, frete grátis, limites de uso e datas de validade.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Criar Novo Cupom
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">Carregando cupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">Nenhum cupom cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Tipo de Desconto</th>
                  <th className="py-3.5 px-4">Benefício</th>
                  <th className="py-3.5 px-4">Valor Mínimo</th>
                  <th className="py-3.5 px-4 text-center">Utilizações</th>
                  <th className="py-3.5 px-4">Validade</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-black font-mono text-sm text-neutral-900">
                      {c.code}
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-700">
                      {c.discountType === 'PERCENTAGE'
                        ? 'Percentual (%)'
                        : c.discountType === 'FIXED'
                        ? 'Valor Fixo (R$)'
                        : 'Frete Grátis'}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {c.discountType === 'PERCENTAGE'
                        ? `${c.discountValue}% OFF`
                        : c.discountType === 'FIXED'
                        ? `${formatCurrency(c.discountValue)} OFF`
                        : 'Frete 100% Grátis'}
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {c.minPurchaseValue > 0 ? formatCurrency(c.minPurchaseValue) : 'Sem valor mínimo'}
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-bold text-neutral-900">{c.usedCount}</span>
                      {c.maxUses && <span className="text-neutral-400"> / {c.maxUses}</span>}
                    </td>

                    <td className="py-3 px-4 text-neutral-500 text-[11px]">
                      {c.expiresAt ? formatDate(c.expiresAt) : 'Sem expiração'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        }`}
                        title="Clique para alternar status"
                      >
                        {c.isActive ? 'Ativo' : 'Pausado'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        title="Excluir cupom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-neutral-900">Criar Novo Cupom</h3>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{error}</div>}

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Código do Cupom *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: FINALCOPA15"
                  className="w-full px-3 py-2 text-xs font-bold uppercase font-mono border border-neutral-300 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
                  >
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                    <option value="FREE_SHIPPING">Frete Grátis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {discountType === 'PERCENTAGE' ? 'Porcentagem (%)' : discountType === 'FIXED' ? 'Valor (R$)' : 'Valor'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={discountType === 'FREE_SHIPPING'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold font-mono border border-neutral-300 rounded-lg outline-none focus:border-black disabled:bg-neutral-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Compra Mínima (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPurchaseValue}
                    onChange={(e) => setMinPurchaseValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Limite de Usos</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Sem limite"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Data de Expiração</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-black"
                />
                <span>Ativar cupom imediatamente</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

