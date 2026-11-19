'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { saveLocalSnapshot } from '@/lib/clientStorage';

export default function NewManualSalePage() {
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [origin, setOrigin] = useState('MANUAL_WHATSAPP'); // MANUAL_WHATSAPP, MANUAL_INSTAGRAM, MANUAL_PRESENCIAL
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  // Cart items in manual sale
  const [saleItems, setSaleItems] = useState<Array<{
    productId: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
          // initialize first item if available
          if (data.products.length > 0) {
            const p = data.products[0];
            const firstAvailableSize = p.sizes.find((s: any) => s.stock > 0) || p.sizes[0];
            setSaleItems([
              {
                productId: p.id,
                size: firstAvailableSize?.size || 'M',
                quantity: 1,
                unitPrice: p.promoPrice || p.price,
              },
            ]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addItemRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    const s = p.sizes[0];
    setSaleItems([
      ...saleItems,
      {
        productId: p.id,
        size: s?.size || 'M',
        quantity: 1,
        unitPrice: p.promoPrice || p.price,
      },
    ]);
  };

  const updateItem = (index: number, field: string, val: any) => {
    const copy = [...saleItems];
    (copy[index] as any)[field] = val;

    // if product changed, auto update price and available sizes
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === val);
      if (p) {
        copy[index].unitPrice = p.promoPrice || p.price;
        const firstSize = p.sizes[0]?.size || 'M';
        copy[index].size = firstSize;
      }
    }

    setSaleItems(copy);
  };

  const removeItemRow = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const subtotal = saleItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || saleItems.length === 0) {
      setError('Informe o nome do cliente e ao menos 1 produto.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/manual-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          customerCpf,
          origin,
          paymentMethod,
          discount: discountVal,
          notes,
          items: saleItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar venda');
      }

      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      router.push('/admin/pedidos');
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar venda manual');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-neutral-500">Carregando catálogo para venda manual...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div>
          <Link
            href="/admin/pedidos"
            className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos Pedidos
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Registrar Venda Manual</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Registre pedidos feitos pelo WhatsApp, Instagram Direct ou balcão com baixa imediata no estoque.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Origin */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            1. Dados da Venda & Cliente
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Carlos Eduardo (WhatsApp)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Canal de Origem</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black bg-white font-semibold"
              >
                <option value="MANUAL_WHATSAPP">💬 WhatsApp Oficial</option>
                <option value="MANUAL_INSTAGRAM">📸 Instagram Direct</option>
                <option value="MANUAL_PRESENCIAL">🏪 Presencial / Balcão da Loja</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(11) 98888-7777"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">E-mail</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="cliente@email.com (opcional)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Products & Sizes */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              2. Mantos Vendidos (Baixa Automática)
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Outro Item
            </button>
          </div>

          <div className="space-y-3">
            {saleItems.map((item, idx) => {
              const selectedProduct = products.find((p) => p.id === item.productId);
              const availableSizes = selectedProduct?.sizes || [];

              return (
                <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Product selector */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Produto</label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white truncate"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.team})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size selector */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Tamanho</label>
                    <select
                      value={item.size}
                      onChange={(e) => updateItem(idx, 'size', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white"
                    >
                      {availableSizes.map((s: any) => (
                        <option key={s.id} value={s.size}>
                          {s.size} ({s.stock} un.)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white text-center font-mono"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-0.5">Valor Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-neutral-300 rounded-lg outline-none focus:border-black bg-white text-right font-mono"
                    />
                  </div>

                  {/* Delete row */}
                  <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                    {saleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            3. Pagamento & Total
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black bg-white font-semibold"
              >
                <option value="PIX">PIX (Comprovante / Chave)</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="MANUAL_BALCAO">Dinheiro / Espécie</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Desconto Concedido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono text-emerald-700 font-bold"
              />
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Total Final da Venda:</span>
              <span className="text-xl font-black text-neutral-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Observações da Venda</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente vai retirar pessoalmente / Enviado motoboy..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin/pedidos"
            className="px-6 py-3 border border-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {submitting ? 'Registrando...' : 'Finalizar Venda & Baixar Estoque'}
          </button>
        </div>
      </form>
    </div>
  );
}

