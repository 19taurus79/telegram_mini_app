import { useQuery } from "@tanstack/react-query";
import { fetchOrdersHeatmapData } from "@/components/MapModule/fetchOrdersWithAddresses";
import { useApplicationsStore } from "@/components/MapModule/store/applicationsStore";
import { filterApplicationsList } from "@/components/MapModule/utils/filterUtils";
import { getInitData } from "@/lib/getInitData";
import { useMemo } from "react";

export function useUnmappedCount() {
  const { selectedManagers, selectedLoBs } = useApplicationsStore();

  const { data: applicationsData } = useQuery({
    queryKey: ["ordersAndAddresses"],
    queryFn: async () => {
      const initData = getInitData();
      return await fetchOrdersHeatmapData(initData);
    },
    staleTime: 60 * 1000,
  });

  const count = useMemo(() => {
    const unmappedApps = applicationsData?.unmappedData || [];
    const filtered = filterApplicationsList(unmappedApps, selectedManagers, selectedLoBs);
    return filtered.length;
  }, [applicationsData, selectedManagers, selectedLoBs]);

  return count;
}
