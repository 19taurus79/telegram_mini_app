"use client";

import { getAllProduct } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./AvStock.module.css";
import { getInitData } from "@/lib/getInitData";
function AvStock() {
  const { selectedGroup, searchValue } = useFilter();
  console.log("page group", selectedGroup);
  console.log("page search", selectedGroup);
  const fill = useFilter();
  console.log(fill);
  const initData = getInitData();
  const { data } = useQuery({
    queryKey: ["products", selectedGroup, searchValue],
    queryFn: () =>
      getAllProduct({
        group: selectedGroup,
        searchValue: searchValue,
        initData,
      }),
    placeholderData: keepPreviousData,
  });
  return (
    <ul className={css.listContainer}>
      {data?.map((item) => (
        <li className={css.listItemButton} key={item.id}>
          <Link href={`/av_stock/${item.id}`} className={css.link}>
            {item.product}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default AvStock;
