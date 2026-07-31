import { useQuery } from "@tanstack/react-query";
import { fetchOrdersHeatmapData } from "@/components/MapModule/fetchOrdersWithAddresses";
import { useMemo } from "react";

export function useUnmappedCount() {
  const { data: applicationsData } = useQuery({
    queryKey: ["ordersAndAddresses"],
    queryFn: async () => {
      return await fetchOrdersHeatmapData();
    },
    staleTime: 60 * 1000,
  });

  const count = useMemo(() => {
    const unmappedApps = applicationsData?.unmappedData || [];
    return unmappedApps.length;
  }, [applicationsData]);

  return count;
}
