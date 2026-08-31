import React from 'react';
import { useAnalyticsStore } from '../../store/analyticsStore';
import ClusterDetailsPanel from './ClusterDetailsPanel';

export default function AnalyticsDetailsWidget() {
  const selectedCluster = useAnalyticsStore(state => state.selectedCluster);
  const setSelectedCluster = useAnalyticsStore(state => state.setSelectedCluster);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0 }}>
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
            minHeight: '140px',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            padding: '24px',
            textAlign: 'center',
            fontSize: '13px',
            lineHeight: 1.6,
          }}>
            📍 Клікніть на будь-який кластер або нарисований полігон на карті чи натисніть <strong>«📊 Деталізація»</strong> у списку зон, щоб переглянути клієнтів, товари та аналітику плеча.
          </div>
        )}
      </div>
    </div>
  );
}
