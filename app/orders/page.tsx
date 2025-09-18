"use client";

// import { getProductOnWarehouse } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Orders.module.css";
import { getClients } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
function Orders() {
  const { selectedGroup, searchValue } = useFilter();
  console.log("page group", selectedGroup);
  console.log("page search", selectedGroup);
  const fill = useFilter();
  console.log(fill);
  const initData = getInitData();
  const { data } = useQuery({
    queryKey: ["clients", selectedGroup, searchValue],
    queryFn: () => getClients({ searchValue, initData }),
    placeholderData: keepPreviousData,
  });
  return (
    <ul className={css.listContainer}>
      {data?.map((item, index) => (
        <li className={css.listItemButton} key={`${item.client}-${index}`}>
          <Link className={css.ref} href={`/orders/${item.id}`}>
            {item.client}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default Orders;
