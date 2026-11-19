'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, AlertCircle, Zap, Trash2, Download, Database, RefreshCw, Upload } from 'lucide-react';
import { saveLocalSnapshot, markCatalogWiped } from '@/lib/clientStorage';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    store_name: 'CHOTE KITS',
    store_tagline: 'Loja Oficial de Mantos & Camisas de Futebol Premium',
    whatsapp_number: '+4196443103',
    instagram_handle: '@chotestore',
    banner_subtitle: 'Mantos oficiais dos maiores clubes do mundo com tecnologia de ponta e acabamento premium.',
    banner_image_url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1600',
    exchange_policy: 'Prazo de troca de até 30 dias corridos após o recebimento. O produto deve estar sem marcas de uso, com etiquetas intactas e na embalagem original.',
    privacy_policy: 'Seus dados pessoais são protegidos com criptografia de ponta a ponta e nunca serão compartilhados com terceiros.',
    terms_of_use: 'Todas as transações são intermediadas com segurança criptográfica. Enviamos código de rastreamento em até 24h úteis.',
    free_shipping_threshold: '399.00',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações');
      }

      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      setFeedback({ text: 'Configurações da loja salvas com sucesso no banco de dados local!', error: false });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ text: err.message || 'Erro ao salvar', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSystemAction = async (action: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === 'wipe_products' || action === 'wipe_all_data') {
          markCatalogWiped();
        }
        setFeedback({ text: data.message || 'Ação executada com sucesso!', error: false });
      } else {
        setFeedback({ text: data.error || 'Erro ao executar ação', error: true });
      }
    } catch {
      setFeedback({ text: 'Erro de conexão ao executar comando no sistema', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/system/reset');
      const data = await res.json();
      if (res.ok && data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chote_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert('Erro ao exportar banco.');
    }
  };

  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Deseja substituir os dados atuais pelos dados deste arquivo JSON?')) return;
    setSaving(true);
    setFeedback(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/admin/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_json', data: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('chote_master_db_snapshot_v1', JSON.stringify(parsed));
        if (parsed.products) {
          localStorage.setItem('chote_master_db_count_v1', parsed.products.length.toString());
        }
        localStorage.removeItem('chote_master_db_explicitly_wiped');
        setFeedback({ text: 'Banco de dados restaurado com sucesso!', error: false });
      } else {
        setFeedback({ text: data.error || 'Erro ao restaurar banco', error: true });
      }
    } catch {
      setFeedback({ text: 'Arquivo JSON inválido ou corrompido', error: true });
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-neutral-500">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Customização Global</span>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Configurações da Loja</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Altere dados de contato, WhatsApp, banners, políticas e frete sem precisar tocar no código-fonte.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${feedback.error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
        >
          {feedback.error ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity & Contact */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            1. Identidade & Contatos Oficiais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Nome da Loja</label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Slogan / Tagline</label>
              <input
                type="text"
                value={settings.store_tagline}
                onChange={(e) => handleChange('store_tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">WhatsApp de Vendas</label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                placeholder="5511999999999"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Instagram Oficial</label>
              <input
                type="text"
                value={settings.instagram_handle}
                onChange={(e) => handleChange('instagram_handle', e.target.value)}
                placeholder="@chotestore.oficial"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">E-mail de Suporte</label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Valor Mínimo para Frete Grátis (R$)</label>
              <input
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) => handleChange('free_shipping_threshold', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Endereço Físico / Sede</label>
              <input
                type="text"
                value={settings.store_address}
                onChange={(e) => handleChange('store_address', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Hero Banner Customization */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            2. Banner Principal da Página Inicial
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Título do Banner</label>
              <input
                type="text"
                value={settings.banner_title}
                onChange={(e) => handleChange('banner_title', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Subtítulo / Descrição</label>
              <textarea
                rows={2}
                value={settings.banner_subtitle}
                onChange={(e) => handleChange('banner_subtitle', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">URL da Imagem de Fundo</label>
              <input
                type="url"
                value={settings.banner_image_url}
                onChange={(e) => handleChange('banner_image_url', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-mono"
              />
            </div>
          </div>
        </div>

        {/* Institutional Policies */}
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            3. Políticas Institucionais da Loja
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Política de Trocas e Devoluções</label>
              <textarea
                rows={3}
                value={settings.exchange_policy}
                onChange={(e) => handleChange('exchange_policy', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Política de Privacidade & Segurança</label>
              <textarea
                rows={3}
                value={settings.privacy_policy}
                onChange={(e) => handleChange('privacy_policy', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Termos de Uso do Serviço</label>
              <textarea
                rows={3}
                value={settings.terms_of_use}
                onChange={(e) => handleChange('terms_of_use', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Gravando no Banco...' : 'Salvar Todas as Configurações'}
          </button>
        </div>
      </form>

      {/* Database Management & Store Reset Section */}
      <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-800" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              4. Gerenciamento do Banco Interno e Reset da Loja
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Utilize estas ferramentas para zerar estoques, limpar produtos de teste e iniciar o catálogo do zero.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Zero Stock */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" /> Zerar Todo o Estoque
              </div>
              <p className="text-[11px] text-neutral-500">
                Mantém os produtos cadastrados, mas define todas as quantidades de todos os tamanhos como 0.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSystemAction('zero_all_stock', 'Deseja ZERAR O ESTOQUE de todos os produtos?')}
              className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors"
            >
              Executar Zeramento
            </button>
          </div>

          {/* Wipe Products */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 mb-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Limpar Catálogo
              </div>
              <p className="text-[11px] text-neutral-500">
                Exclui todos os produtos, imagens e estoques. Deixa a loja limpa para adicionar do zero.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSystemAction('wipe_products', 'PERIGO: Deseja EXCLUIR TODOS OS PRODUTOS do catálogo? Esta ação é definitiva.')}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold transition-colors"
            >
              Limpar Produtos
            </button>
          </div>

          {/* Backup Database */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 mb-1">
                <Download className="w-3.5 h-3.5 text-blue-600" /> Baixar Backup JSON
              </div>
              <p className="text-[11px] text-neutral-500">
                Baixa o arquivo store_db.json completo com produtos, fotos e categorias.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-lg text-xs font-bold transition-colors"
            >
              Baixar Backup
            </button>
          </div>

          {/* Restore Database */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 mb-1">
                <Upload className="w-3.5 h-3.5 text-emerald-600" /> Restaurar Backup JSON
              </div>
              <p className="text-[11px] text-neutral-500">
                Suba um arquivo store_db.json salvo anteriormente para restaurar tudo.
              </p>
            </div>
            <label className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold transition-colors text-center cursor-pointer block">
              <span>Selecionar Arquivo JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

