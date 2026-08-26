'use client';

import React, { useState } from 'react';
import styles from './DataAuditWidget.module.css';
import { AlertTriangle, MapPinOff, Filter, CheckCircle2, ShieldAlert } from 'lucide-react';
import UnmappedClientsModal from './UnmappedClientsModal';

export type DataSourceType = 'applications' | 'deliveries' | 'combined';

export interface DataAuditMetrics {
  totalRaw: number;
  includedCount: number;
  includedWeightTons: number;
  zeroWeightCount: number;
  unmappedCount: number;
  filteredOutCount: number;
  outliersCount?: number;
  unmappedClients: { client: string; totalWeight?: number; ordersCount?: number }[];
}

interface Props {
  dataSource: DataSourceType;
  onDataSourceChange: (src: DataSourceType) => void;
  metrics: DataAuditMetrics;
  includeZeroWeight: boolean;
  onToggleIncludeZeroWeight: (val: boolean) => void;
  fallbackWeightKg: number;
  onChangeFallbackWeightKg: (val: number) => void;
  autoFilterOutliers: boolean;
  onToggleAutoFilter: (val: boolean) => void;
  maxRadiusKm: number;
  onChangeMaxRadiusKm: (val: number) => void;
}

export default function DataAuditWidget({
  dataSource,
  onDataSourceChange,
  metrics,
  includeZeroWeight,
  onToggleIncludeZeroWeight,
  fallbackWeightKg,
  onChangeFallbackWeightKg,
  autoFilterOutliers,
  onToggleAutoFilter,
  maxRadiusKm,
  onChangeMaxRadiusKm,
}: Props) {
  const [isUnmappedModalOpen, setIsUnmappedModalOpen] = useState(false);

  return (
    <div className={styles.auditContainer}>
      {/* Data Source Selector */}
      <div className={styles.sourceSelector}>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'applications' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('applications')}
          title="Замовлення клієнтів з 1С (Заявки)"
        >
          📦 Заявки 1С
        </button>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'deliveries' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('deliveries')}
          title="Створені логістичні доставки"
        >
          🚚 Доставки
        </button>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'combined' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('combined')}
          title="Об'єднати заявки та доставки"
        >
          🔄 Усі разом
        </button>
      </div>

      {/* Metrics Grid */}
      <div className={styles.statsGrid}>
        {/* Included */}
        <div className={`${styles.statCard} ${styles.statCardIncluded}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>В аналітиці</span>
            <CheckCircle2 size={13} color="#34d399" />
          </div>
          <div className={`${styles.statVal} ${styles.statValIncluded}`}>{metrics.includedCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>{metrics.includedWeightTons.toFixed(1)} т ваги</div>
        </div>

        {/* Zero Weight */}
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Без ваги (0 кг)</span>
            <AlertTriangle size={13} color="#fbbf24" />
          </div>
          <div className={`${styles.statVal} ${styles.statValWarning}`}>{metrics.zeroWeightCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>
            {includeZeroWeight ? '🟢 Враховані з авто-вагою' : '🔴 Відсічені калькулятором'}
          </div>
        </div>

        {/* Unmapped Coordinates */}
        <div className={`${styles.statCard} ${styles.statCardDanger}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Без координат</span>
            <MapPinOff size={13} color="#f87171" />
          </div>
          <div className={`${styles.statVal} ${styles.statValDanger}`}>{metrics.unmappedCount} <span style={{ fontSize: 11, fontWeight: 500 }}>клієнтів</span></div>
          <div className={styles.statSub}>Не мають гео-прив&apos;язки</div>
        </div>

        {/* Filtered Out */}
        <div className={`${styles.statCard} ${styles.statCardInfo}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Відфільтровано</span>
            <Filter size={13} color="#818cf8" />
          </div>
          <div className={styles.statVal}>{metrics.filteredOutCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>За датою/менеджером</div>
        </div>

        {/* Outliers */}
        {metrics.outliersCount !== undefined && metrics.outliersCount > 0 && (
          <div className={`${styles.statCard} ${styles.statCardDanger}`} style={{ border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)' }}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel} style={{ color: '#fca5a5' }}>Гео-аномалії</span>
              <ShieldAlert size={13} color="#fca5a5" />
            </div>
            <div className={`${styles.statVal} ${styles.statValDanger}`} style={{ color: '#fca5a5' }}>
              {metrics.outliersCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span>
            </div>
            <div className={styles.statSub} style={{ color: '#fca5a5' }}>Відкинуто (занадто далеко)</div>
          </div>
        )}
      </div>

      {/* Quick Actions & Fixes */}
      <div className={styles.fixSection}>
        {/* Toggle Fallback Weight */}
        <div className={styles.fixRow}>
          <label className={styles.fixToggleLabel}>
            <input
              type="checkbox"
              checked={includeZeroWeight}
              onChange={e => onToggleIncludeZeroWeight(e.target.checked)}
              className={styles.fixToggleInput}
            />
            <span>Авто-вага для замовлень без ваги</span>
          </label>

          {includeZeroWeight && (
            <div className={styles.weightInputGroup}>
              <input
                type="number"
                min="10"
                max="50000"
                step="50"
                value={fallbackWeightKg}
                onChange={e => onChangeFallbackWeightKg(Math.max(1, Number(e.target.value) || 100))}
                className={styles.weightInput}
              />
              <span className={styles.weightUnit}>кг</span>
            </div>
          )}
        </div>

        {/* Filter Outliers */}
        <div className={styles.fixRow}>
          <label className={styles.fixToggleLabel}>
            <input
              type="checkbox"
              checked={autoFilterOutliers}
              onChange={e => onToggleAutoFilter(e.target.checked)}
              style={{ accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px' }}>Відкидати гео-аномалії (Z-score)</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Автоматично прибирати поодинокі віддалені доставки</span>
            </div>
          </label>
        </div>

        <div className={styles.fixRow}>
          <label className={styles.fixToggleLabel} style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '13px' }}>Макс. радіус від Центру Мас (км)</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Жорсткий ліміт для аналітики</span>
            </div>
            <input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={maxRadiusKm}
              onChange={e => onChangeMaxRadiusKm(Number(e.target.value) || 300)}
              style={{
                width: '60px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            />
          </label>
        </div>

        {/* Unmapped Modal Trigger */}
        {metrics.unmappedCount > 0 && (
          <button
            className={styles.unmappedBtn}
            onClick={() => setIsUnmappedModalOpen(true)}
          >
            <ShieldAlert size={14} />
            <span>Переглянути негеокодованих ({metrics.unmappedCount})</span>
          </button>
        )}
      </div>

      {/* Unmapped Clients Modal */}
      <UnmappedClientsModal
        isOpen={isUnmappedModalOpen}
        onClose={() => setIsUnmappedModalOpen(false)}
        unmappedClients={metrics.unmappedClients}
      />
    </div>
  );
}
