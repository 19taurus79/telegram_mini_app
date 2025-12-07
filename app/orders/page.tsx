"use client";

import { useInitData } from "@/store/InitData";
import { InitData } from "@/store/InitData";
import OrdersDashboard from "@/components/Orders/OrdersDashboard/OrdersDashboard";

// Keep imports for old version just in case, but we are replacing whole render
// import { useFilter } from "@/context/FilterContext";
// import Link from "next/link";
// import css from "./Orders.module.css";
// import { getClients } from "@/lib/api";
// import { keepPreviousData, useQuery } from "@tanstack/react-query";

function Orders() {
  // const { selectedGroup, searchValue } = useFilter();
  const initData = useInitData((state: InitData) => state.initData);

  return (
    <>
      {initData ? (
        <OrdersDashboard initData={initData} />
      ) : (
        <div style={{ padding: "20px" }}>Завантаження...</div>
      )}
    </>
  );
}

export default Orders;
