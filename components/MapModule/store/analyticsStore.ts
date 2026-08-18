import { create } from 'zustand';
import { ClusterData } from '../components/AnalyticsMap/HubCalculator';

interface AnalyticsState {
  selectedCluster: ClusterData | null;
  setSelectedCluster: (cluster: ClusterData | null) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  selectedCluster: null,
  setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),
}));
