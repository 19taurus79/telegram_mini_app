import { useQuery } from "@tanstack/react-query";
import { fetchOrdersHeatmapData } from "@/components/MapModule/fetchOrdersWithAddresses";
import { useMemo } from "react";
import { useUser } from "@/store/User";

export function useUnmappedCount() {
  const userData = useUser((s) => s.userData);

  const { data: applicationsData } = useQuery({
    queryKey: ["ordersAndAddresses"],
    queryFn: async () => {
      return await fetchOrdersHeatmapData();
    },
    staleTime: 60 * 1000,
  });

  const count = useMemo(() => {
    const unmappedApps = applicationsData?.unmappedData || [];
    if (userData?.is_admin) return unmappedApps.length;

    const myName = userData?.full_name_for_orders?.trim().toLowerCase() ?? "";
    if (!myName) return unmappedApps.length;

    return unmappedApps.filter((item) => {
      const manager = (item.orders?.[0]?.manager ?? "").trim().toLowerCase();
      return manager === myName;
    }).length;
  }, [applicationsData, userData]);

  return count;
}
