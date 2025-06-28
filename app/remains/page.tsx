"use client";

import { getProductOnWarehouse } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Remains.module.css";
function Remains() {
  const { selectedGroup, searchValue } = useFilter();
  console.log("page group", selectedGroup);
  console.log("page search", selectedGroup);
  const fill = useFilter();
  console.log(fill);

  const { data } = useQuery({
    queryKey: ["products", selectedGroup, searchValue],
    queryFn: () =>
      getProductOnWarehouse({ group: selectedGroup, searchValue: searchValue }),
    placeholderData: keepPreviousData,
  });
  return (
    <ul className={css.listContainer}>
      {data?.map((item) => (
        <li className={css.listItemButton} key={item.id}>
          <Link href={`/remains/${item.id}`} className={css.link}>
            {item.product}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default Remains;
