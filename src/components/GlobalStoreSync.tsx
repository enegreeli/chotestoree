'use client';

import { useEffect } from 'react';
import { loadLocalSnapshot, isCatalogExplicitlyWiped } from '@/lib/clientStorage';

/**
 * 100% LOCAL background auto-sync & heal engine.
 * Ensures the store never shows an empty catalog if local environment restarts.
 */
export default function GlobalStoreSync() {
  useEffect(() => {
    const checkAndHeal = async () => {
      try {
        if (isCatalogExplicitlyWiped()) return;

        const res = await fetch('/api/products?take=1', { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json();
        if (data.products && data.products.length === 0) {
          const localSnapshot = await loadLocalSnapshot();
          if (localSnapshot && localSnapshot.products && localSnapshot.products.length > 0) {
            await fetch('/api/admin/system/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'import_json',
                data: localSnapshot,
              }),
            });
          }
        }
      } catch {}
    };

    checkAndHeal();
  }, []);

  return null;
}
