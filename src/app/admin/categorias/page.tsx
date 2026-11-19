'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FolderTree, Plus, Edit, Trash2, X, CheckCircle, ImageIcon } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import { saveLocalSnapshot } from '@/lib/clientStorage';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setSortOrder((categories.length + 1).toString());
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.imageUrl || '');
    setSortOrder(cat.sortOrder.toString());
    setIsActive(cat.isActive);
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Deseja realmente excluir a categoria "${catName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir');
        return;
      }
      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }
      fetchCategories();
    } catch {
      alert('Erro ao excluir');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          imageUrl: imageUrl || null,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar categoria');
      }

      if (data.snapshot) {
        await saveLocalSnapshot(data.snapshot);
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar categoria');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Estrutura do Catálogo</span>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Gerenciamento de Categorias</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Organize os mantos da loja em categorias personalizadas como Nacionais, Internacionais, Retrô e Seleções.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Categoria
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500">Carregando categorias...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Ordem</th>
                  <th className="py-3.5 px-4">Capa</th>
                  <th className="py-3.5 px-4">Nome da Categoria</th>
                  <th className="py-3.5 px-4">Slug (URL)</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4 text-center">Produtos Vinculados</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-500">#{c.sortOrder}</td>
                    <td className="py-3 px-4">
                      {c.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                          <Image src={c.imageUrl} alt={c.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-neutral-500">{c.slug}</td>
                    <td className="py-3 px-4 text-neutral-600 truncate max-w-xs">{c.description || '-'}</td>
                    <td className="py-3 px-4 text-center font-bold text-neutral-900">
                      {c._count?.products || 0} produto(s)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {c.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1 text-neutral-600 hover:text-black"
                          title="Editar categoria"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1 text-neutral-400 hover:text-rose-600"
                          title="Excluir"
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

      {/* Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                      );
                    }
                  }}
                  placeholder="Ex: Camisas Retrô"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="camisas-retro"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Ordem de Exibição</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da categoria..."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Foto de Capa da Categoria (Do PC ou Celular)
                </label>
                <ImageUploader
                  images={imageUrl ? [imageUrl] : []}
                  onChange={(imgs) => setImageUrl(imgs[0] || '')}
                  maxImages={1}
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-black"
                />
                <span>Categoria ativa na loja</span>
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
                  {submitting ? 'Salvando...' : 'Salvar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

