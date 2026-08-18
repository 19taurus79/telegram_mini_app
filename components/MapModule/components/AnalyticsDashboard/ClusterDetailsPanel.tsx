import React, { useState } from 'react';
import { ClusterData } from '../AnalyticsMap/HubCalculator';

type Props = {
  cluster: ClusterData;
  onClose: () => void;
};

export default function ClusterDetailsPanel({ cluster, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'clients' | 'products' | 'deliveries'>('summary');

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
    color: isActive ? 'var(--foreground)' : 'var(--text-muted)',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s ease',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>Деталізація Зони #{cluster.clusterId}</h3>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          fontSize: '20px', cursor: 'pointer', padding: 0
        }}>&times;</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto' }}>
        <div style={tabStyle(activeTab === 'summary')} onClick={() => setActiveTab('summary')}>Огляд</div>
        <div style={tabStyle(activeTab === 'clients')} onClick={() => setActiveTab('clients')}>Клієнти</div>
        <div style={tabStyle(activeTab === 'products')} onClick={() => setActiveTab('products')}>Товари</div>
        <div style={tabStyle(activeTab === 'deliveries')} onClick={() => setActiveTab('deliveries')}>Доставки</div>
      </div>

      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Всього доставок</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>{cluster.deliveries.length} шт</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Загальна вага</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>{(cluster.totalWeight / 1000).toFixed(2)} т</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Площа зони</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>{cluster.areaSqKm.toFixed(2)} км²</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Щільність</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '6px' }}>{(cluster.totalWeight / 1000 / cluster.areaSqKm).toFixed(2)} т/км²</div>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa', fontSize: '13px' }}>Оптимальний Локальний Хаб</h4>
              <p style={{ fontSize: '12px', margin: '0 0 8px 0' }}>Ідеальна точка для перевалки вантажу (крос-докінгу).</p>
              {cluster.localCog ? (
                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', display: 'block' }}>
                  {cluster.localCog.lat.toFixed(6)}, {cluster.localCog.lng.toFixed(6)}
                </code>
              ) : (
                <span style={{ fontSize: '12px' }}>Недостатньо даних.</span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Клієнт (Топ-5)</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Замовлень</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Вага (кг)</th>
              </tr>
            </thead>
            <tbody>
              {cluster.topClients.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{c.client}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{c.count}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{c.weight.toLocaleString()}</td>
                </tr>
              ))}
              {cluster.topClients.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center' }}>Дані відсутні</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'products' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 4px' }}>Товар (Топ-5)</th>
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
                <tr><td colSpan={2} style={{ padding: '16px', textAlign: 'center' }}>Дані відсутні</td></tr>
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
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Вага</th>
              </tr>
            </thead>
            <tbody>
              {cluster.deliveries.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.client + " - " + d.address}>{d.client}</td>
                  <td style={{ padding: '8px 4px' }}>{d.delivery_date ?? (d as Record<string, unknown>).date as string ?? '—'}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{d.total_weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
