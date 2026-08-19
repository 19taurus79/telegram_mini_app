'use client';

import React, { useState, useMemo } from 'react';
import styles from './UnmappedClientsModal.module.css';
import { X, Search, ExternalLink, MapPinOff } from 'lucide-react';
import Link from 'next/link';

interface UnmappedClientItem {
  client: string;
  totalWeight?: number;
  ordersCount?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unmappedClients: UnmappedClientItem[];
}

export default function UnmappedClientsModal({ isOpen, onClose, unmappedClients }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return unmappedClients;
    const term = searchTerm.toLowerCase();
    return unmappedClients.filter(c => c.client.toLowerCase().includes(term));
  }, [unmappedClients, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <MapPinOff size={18} color="#f87171" />
            <span>Клієнти без гео-координат</span>
            <span className={styles.badge}>{unmappedClients.length}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              placeholder="Пошук клієнта..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* List */}
        <div className={styles.content}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
              {searchTerm ? 'Клієнтів не знайдено за запитом' : 'Всі клієнти мають точні гео-координати! 🎉'}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div key={`${item.client}-${idx}`} className={styles.clientItem}>
                <div className={styles.clientName}>{item.client}</div>
                <div className={styles.clientMeta}>
                  {item.totalWeight !== undefined && (
                    <span><strong>{((item.totalWeight || 0) / 1000).toFixed(2)}</strong> т</span>
                  )}
                  {item.ordersCount !== undefined && (
                    <span>{item.ordersCount} замовл.</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Прив&apos;яжіть координати в модулі адрес, щоб вони з&apos;явилися на карті
          </span>
          <Link href="/address_fix" className={styles.fixModuleBtn} target="_blank">
            <span>Модуль прив&apos;язки адрес</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
