import React from 'react';
import * as XLSX from 'xlsx';
import { ClusterData } from '../AnalyticsMap/HubCalculator';
import { Download } from 'lucide-react';
import { SavedZone, CandidateWarehouse } from '../AnalyticsMap/AnalyticsMap';
import { warehouses } from '../../warehouses';
import { ClientAddress } from '@/types/types';

function formatCatalogAddress(c?: ClientAddress | null): string {
  if (!c) return '—';
  const parts: string[] = [];
  if (c.region) parts.push(`${c.region} обл.`);
  if (c.area) parts.push(`${c.area} р-н`);
  if (c.commune) parts.push(`${c.commune} громада`);
  if (c.city) parts.push(c.city);
  return parts.length > 0 ? parts.join(', ') : '—';
}

type Props = {
  clusters: ClusterData[];
  dateRange: { start: string, end: string };
  savedZones?: SavedZone[];
  candidateWarehouses?: CandidateWarehouse[];
  clients?: ClientAddress[];
};

export default function AnalyticsExport({ clusters, dateRange, savedZones = [], candidateWarehouses = [], clients = [] }: Props) {
  
  const handleExportExcel = () => {
    // Lookup map for fast client directory retrieval
    const clientCatalogMap = new Map<string, ClientAddress>();
    clients.forEach(c => {
      if (c && c.client) {
        clientCatalogMap.set(c.client.trim().toLowerCase(), c);
      }
    });

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
        // Find all saved zones that contain this client
        const matchingZones = savedZones.filter(z => z.clients.includes(d.client));
        const primaryZone = matchingZones[0];
        
        let warehouseName = '';
        if (primaryZone && primaryZone.warehouseId) {
          if (primaryZone.warehouseId.startsWith('wh-')) {
            const wh = warehouses.find(w => `wh-${w.id}` === primaryZone.warehouseId);
            if (wh) warehouseName = wh.name;
          } else {
            const cand = candidateWarehouses.find(cw => cw.id === primaryZone.warehouseId);
            if (cand) warehouseName = cand.name;
          }
        }

        const catalogClient = d.client ? clientCatalogMap.get(d.client.trim().toLowerCase()) : undefined;
        const catalogAddress = formatCatalogAddress(catalogClient);

        const allZoneNames = matchingZones.map(z => z.name).join(', ');
        const isOverlapping = matchingZones.length > 1;

        return {
          'ID Кластеру': c.clusterId,
          'Клієнт': d.client,
          'Зона (Територія)': primaryZone ? primaryZone.name : '',
          'Всі зони клієнта': allZoneNames || '—',
          'Перетин зон': isOverlapping ? `Так (${allZoneNames})` : 'Ні',
          'Склад обслуговування': warehouseName,
          'Адреса доставки': d.address,
          'Довідкова адреса (довідник)': catalogAddress,
          'Менеджер': d.manager || catalogClient?.manager || '',
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
