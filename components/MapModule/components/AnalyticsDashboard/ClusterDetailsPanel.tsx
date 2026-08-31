'use client';

import React, { useState } from 'react';
import { ClusterData } from '../AnalyticsMap/HubCalculator';

type Props = {
  cluster: ClusterData;
  onClose: () => void;
};

export default function ClusterDetailsPanel({ cluster, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'clients' | 'products' | 'deliveries'>('summary');

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
    color: isActive ? 'var(--foreground)' : 'var(--text-muted)',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s ease',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>
          {cluster.name ? `Деталізація: ${cluster.name}` : `Деталізація Зони #${cluster.clusterId}`}
          <span style={{ marginLeft: 8, fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
            {cluster.deliveries.length} клієнтів · {(cluster.totalWeight / 1000).toFixed(2)} т
          </span>
        </h3>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          fontSize: '20px', cursor: 'pointer', padding: 0,
        }}>&times;</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto', flexShrink: 0 }}>
        <div style={tabStyle(activeTab === 'summary')} onClick={() => setActiveTab('summary')}>Огляд</div>
        <div style={tabStyle(activeTab === 'clients')} onClick={() => setActiveTab('clients')}>
          Клієнти ({cluster.deliveries.length})
        </div>
        <div style={tabStyle(activeTab === 'products')} onClick={() => setActiveTab('products')}>Товари</div>
        <div style={tabStyle(activeTab === 'deliveries')} onClick={() => setActiveTab('deliveries')}>Доставки</div>
      </div>

      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <StatCard label="Всього клієнтів" value={`${cluster.deliveries.length} шт`} />
              <StatCard label="Загальна вага" value={`${(cluster.totalWeight / 1000).toFixed(2)} т`} />
              <StatCard label="Площа зони" value={`${cluster.areaSqKm.toFixed(2)} км²`} />
              <StatCard
                label="Щільність"
                value={cluster.areaSqKm > 0 ? `${(cluster.totalWeight / 1000 / cluster.areaSqKm).toFixed(2)} т/км²` : '—'}
              />
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '14px',
              borderRadius: '10px',
              marginTop: '4px',
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#60a5fa', fontSize: '13px' }}>
                📍 Рекомендоване місце хабу (Локальний CoG)
              </h4>
              <p style={{ fontSize: '11px', margin: '0 0 10px 0', color: '#94a3b8', lineHeight: 1.5 }}>
                Математично розрахована точка мінімального тонно-кілометражу для останньої милі.
                Ідеальне місце для оренди майданчика крос-докінгу.
              </p>
              {cluster.localCog ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <code style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#e2e8f0',
                  }}>
                    {cluster.localCog.lat.toFixed(6)}, {cluster.localCog.lng.toFixed(6)}
                  </code>
                  <a
                    href={`https://www.google.com/maps?q=${cluster.localCog.lat},${cluster.localCog.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      background: 'rgba(59,130,246,0.15)',
                      border: '1px solid rgba(59,130,246,0.4)',
                      color: '#60a5fa',
                      fontSize: '11px',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    🗺️ Google Maps
                  </a>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#64748b' }}>Недостатньо даних для розрахунку.</span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && <ClientsTab cluster={cluster} />}

        {activeTab === 'products' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Товар</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>К-ть</th>
              </tr>
            </thead>
            <tbody>
              {cluster.topProducts.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{p.product}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{p.quantity.toLocaleString()}</td>
                </tr>
              ))}
              {cluster.topProducts.length === 0 && (
                <tr><td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Дані відсутні</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'deliveries' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Клієнт</th>
                <th style={{ padding: '8px 4px' }}>Дата</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Вага (кг)</th>
              </tr>
            </thead>
            <tbody>
              {cluster.deliveries.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td
                    style={{ padding: '6px 4px', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={`${d.client} — ${d.address}`}
                  >
                    {d.client}
                  </td>
                  <td style={{ padding: '6px 4px', color: '#94a3b8' }}>
                    {d.delivery_date ?? (d as Record<string, unknown>).date as string ?? '—'}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right' }}>{(d.total_weight || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '14px',
      borderRadius: '10px',
    }}>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</span>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>{value}</div>
    </div>
  );
}

// ─── Clients Tab with search and full list ──────────────────────────────────────
function ClientsTab({ cluster }: { cluster: ClusterData }) {
  const [search, setSearch] = useState('');

  // Build FULL clients list from ALL deliveries (not just topClients top-5)
  const allClientsMap: Record<string, { weight: number; count: number }> = {};
  cluster.deliveries.forEach(d => {
    const name = d.client || 'Невідомий';
    if (!allClientsMap[name]) allClientsMap[name] = { weight: 0, count: 0 };
    allClientsMap[name].weight += d.total_weight || 0;
    allClientsMap[name].count += 1;
  });

  const allClients = Object.entries(allClientsMap)
    .map(([client, data]) => ({ client, ...data }))
    .sort((a, b) => b.weight - a.weight);

  const filtered = search
    ? allClients.filter(c => c.client.toLowerCase().includes(search.toLowerCase()))
    : allClients;

  const totalWeight = cluster.totalWeight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="text"
        placeholder={`Пошук серед ${allClients.length} клієнтів...`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--foreground)',
          fontSize: '12px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#64748b' }}>
            <th style={{ padding: '6px 4px' }}>Клієнт</th>
            <th style={{ padding: '6px 4px', textAlign: 'right' }}>Замовл.</th>
            <th style={{ padding: '6px 4px', textAlign: 'right' }}>Вага (кг)</th>
            <th style={{ padding: '6px 4px', textAlign: 'right' }}>% зони</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => {
            const rank = allClients.indexOf(c);
            return (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{
                  padding: '6px 4px',
                  fontWeight: rank < 3 ? 600 : 'normal',
                  color: rank === 0 ? '#fbbf24' : rank === 1 ? '#94a3b8' : rank === 2 ? '#b45309' : 'inherit',
                }}>
                  {rank === 0 ? '🥇 ' : rank === 1 ? '🥈 ' : rank === 2 ? '🥉 ' : `${rank + 1}. `}{c.client}
                </td>
                <td style={{ padding: '6px 4px', textAlign: 'right', color: '#94a3b8' }}>{c.count}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{c.weight.toLocaleString()}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', color: '#64748b' }}>
                  {totalWeight > 0 ? `${((c.weight / totalWeight) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                Нічого не знайдено
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {search && (
        <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'right' }}>
          Показано {filtered.length} з {allClients.length}
        </div>
      )}
    </div>
  );
}
