"use client";

import OrdersDashboard from "@/components/Orders/OrdersDashboard/OrdersDashboard";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Orders.module.css";
import { getClients } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

// Old mobile version component
function OrdersMobile() {
  const { searchValue } = useFilter();
  
  const { data: clients } = useQuery({
    queryKey: ["clients", searchValue],
    queryFn: () => getClients(searchValue || null),
    placeholderData: keepPreviousData,
  });

  return (
    <div className={css.listContainer}>
      {clients?.map((client) => (
        <Link key={client.id} href={`/orders/${client.id}`} className={css.ref}>
          <div className={css.listItemButton}>
            {client.client}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Orders() {
  return (
    <>
        <div className={css.desktopOnly} style={{height: '100%'}}>
             <OrdersDashboard />
        </div>
        <div className={css.mobileOnly}>
             <OrdersMobile />
        </div>
    </>
  );
}

export default Orders;
