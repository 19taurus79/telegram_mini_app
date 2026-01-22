"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import BackBtn from "@/components/BackBtn/BackBtn";
import { getPartyData } from "@/lib/api";
import css from "./DataList.module.css";

type Props = {
  params: Promise<{ party: string }>;
};

export default function PartyData({ params }: Props) {
  const [party, setParty] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then((p) => setParty(p.party));
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ["partyData", party],
    queryFn: () => getPartyData({ party: party! }),
    enabled: !!party,
  });

  if (!party || isLoading) {
    return <div className={css.list}>Завантаження...</div>;
  }

  if (!data || data.length === 0) {
    return <div className={css.list}>Дані не знайдено</div>;
  }

  return (
    <>
      {data.map((item) => (
        <ul key={item.crop_year} className={css.list}>
          <li className={css.listItem}>МТН: {item.mtn}</li>
          <li className={css.listItem}>Схожість: {item.germination}</li>
          <li className={css.listItem}>Рік урожаю: {item.crop_year}</li>
          <li className={css.listItem}>
            Країна походження: {item.origin_country}
          </li>
          <li className={css.listItem}>Вага одиниці: {item.weight}</li>
        </ul>
      ))}
      <BackBtn />
    </>
  );
}
