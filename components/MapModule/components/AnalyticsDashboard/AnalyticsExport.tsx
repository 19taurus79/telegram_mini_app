import React from 'react';
import * as XLSX from 'xlsx';
import { ClusterData } from '../AnalyticsMap/HubCalculator';
import { Download } from 'lucide-react';
import { SavedZone, CandidateWarehouse } from '../AnalyticsMap/AnalyticsMap';
import { warehouses } from '../../warehouses';

type Props = {
  clusters: ClusterData[];
  dateRange: { start: string, end: string };
  savedZones?: SavedZone[];
  candidateWarehouses?: CandidateWarehouse[];
};

export default function AnalyticsExport({ clusters, dateRange, savedZones = [], candidateWarehouses = [] }: Props) {
  
  const handleExportExcel = () => {
    // Sheet 1: Summary by Clusters
    const summaryData = clusters.map(c => ({
      'ID Кластеру': c.clusterId,
      'Кількість доставок': c.deliveries.length,
      'Загальна вага (кг)': c.totalWeight,
      'Площа (км²)': c.areaSqKm,
      'Щільність (т/км²)': c.density,
      'Широта центру': c.center.lat,
      'Довгота центру': c.center.lng,
      'Локальний Хаб (Широта)': c.localCog?.lat || '',
      'Локальний Хаб (Довгота)': c.localCog?.lng || '',
      'Топ Клієнт': c.topClients[0]?.client || '',
      'Топ Товар': c.topProducts[0]?.product || ''
    }));

    // Sheet 2: Detailed Deliveries
    const detailedData = clusters.flatMap(c => 
      c.deliveries.map(d => {
        // Find if this client belongs to any saved zone
        const zone = savedZones.find(z => z.clients.includes(d.client));
        let warehouseName = '';
        if (zone && zone.warehouseId) {
          if (zone.warehouseId.startsWith('wh-')) {
            const wh = warehouses.find(w => `wh-${w.id}` === zone.warehouseId);
            if (wh) warehouseName = wh.name;
          } else {
            const cand = candidateWarehouses.find(cw => cw.id === zone.warehouseId);
            if (cand) warehouseName = cand.name;
          }
        }

        return {
          'ID Кластеру': c.clusterId,
          'Клієнт': d.client,
          'Зона (Територія)': zone ? zone.name : '',
          'Склад обслуговування': warehouseName,
          'Адреса': d.address,
          'Менеджер': d.manager,
          'Дата': d.delivery_date,
          'Вага (кг)': d.total_weight,
          'Широта': d.latitude,
          'Довгота': d.longitude,
          'Коментар': d.comment
        };
      })
    );

    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Звіт по зонах');
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'Деталізація');

    const fileName = `analytics_delivery_${dateRange.start || 'all'}_${dateRange.end || 'all'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button 
        onClick={handleExportExcel}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '6px',
          background: 'var(--primary-color)', color: 'white',
          border: 'none', cursor: 'pointer', fontSize: '13px'
        }}
      >
        <Download size={16} /> Excel
      </button>
      <button 
        onClick={handlePrintPdf}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '6px',
          background: 'transparent', color: 'var(--foreground)',
          border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '13px'
        }}
      >
        Друк / PDF
      </button>
    </div>
  );
}
