'use client';

import React, { useEffect, useState } from 'react';
import { Database, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { saveLocalSnapshot, loadLocalSnapshot, isCatalogExplicitlyWiped } from '@/lib/clientStorage';

export default function AdminAutoSync() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'restored' | 'saved'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const syncCheck = async () => {
    try {
      const res = await fetch('/api/admin/system/reset', { cache: 'no-store' });
      if (!res.ok) return;

      const result = await res.json();
      if (!result.success || !result.data) return;

      const serverData = result.data;
      const serverProducts = serverData.products || [];
      const serverCount = serverProducts.length;

      setProductCount(serverCount);

      // Always mirror current server state to client storage for local export/backup
      await saveLocalSnapshot(serverData);
      setSyncStatus('saved');
    } catch (e) {
      console.warn('Sync check error:', e);
    }
  };

  useEffect(() => {
    syncCheck();

    // Re-check periodically every 15 seconds
    const interval = setInterval(syncCheck, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/system/reset');
      const data = await res.json();
      if (res.ok && data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `store_db_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert('Erro ao baixar backup.');
    }
  };

  return (
    <>
      {message && (
        <div className="fixed bottom-4 right-4 z-50 p-3 bg-neutral-900 text-white rounded-xl shadow-2xl border border-neutral-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="hidden md:flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-neutral-800">
          Banco Local Ativo {productCount !== null ? `(${productCount} produtos)` : ''}
        </span>
        <button
          onClick={handleDownloadBackup}
          className="ml-2 text-[10px] font-bold text-neutral-500 hover:text-black underline flex items-center gap-1"
          title="Baixar cópia de segurança do arquivo store_db.json"
        >
          <Download className="w-3 h-3" /> Backup JSON
        </button>
      </div>
    </>
  );
}
