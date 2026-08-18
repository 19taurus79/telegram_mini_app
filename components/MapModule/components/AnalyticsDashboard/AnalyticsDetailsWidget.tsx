import React from 'react';
import { useAnalyticsStore } from '../../store/analyticsStore';
import ClusterDetailsPanel from './ClusterDetailsPanel';

export default function AnalyticsDetailsWidget() {
  const selectedCluster = useAnalyticsStore(state => state.selectedCluster);
  const setSelectedCluster = useAnalyticsStore(state => state.setSelectedCluster);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--glass-border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.03)',
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
          Деталізація Зони
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {selectedCluster ? (
          <ClusterDetailsPanel 
            cluster={selectedCluster} 
            onClose={() => setSelectedCluster(null)} 
          />
        ) : (
          <div style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            padding: '24px',
            textAlign: 'center',
            fontSize: '14px',
          }}>
            Оберіть зону на карті для перегляду детальної аналітики
          </div>
        )}
      </div>
    </div>
  );
}
