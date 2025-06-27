"use client";

// import { getProductOnWarehouse } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Orders.module.css";
import { getClients } from "@/lib/api";
function Orders() {
  const { selectedGroup, searchValue } = useFilter();
  console.log("page group", selectedGroup);
  console.log("page search", selectedGroup);
  const fill = useFilter();
  console.log(fill);

  const { data } = useQuery({
    queryKey: ["clients", selectedGroup, searchValue],
    queryFn: () => getClients({ searchValue }),
    placeholderData: keepPreviousData,
  });
  return (
    <ul className={css.listContainer}>
      {data?.map((item) => (
        <li className={css.listItemButton} key={item.client}>
          <Link href={`/orders/${item.client}`}>{item.client}</Link>
        </li>
      ))}
    </ul>
  );
}

export default Orders;
