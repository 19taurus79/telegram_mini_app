"use client";

import { useInitData } from "@/store/InitData";
import { InitData } from "@/store/InitData";
import OrdersDashboard from "@/components/Orders/OrdersDashboard/OrdersDashboard";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Orders.module.css";
import { getClients } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Search, X } from "lucide-react";

// Modern mobile version component
function OrdersMobile({ initData }: { initData: string }) {
  const { searchValue, setSearchValue } = useFilter();
  
  const { data: clients } = useQuery({
    queryKey: ["clients", initData, searchValue],
    queryFn: () => getClients({ searchValue: searchValue || null, initData }),
    placeholderData: keepPreviousData,
    enabled: !!initData
  });

  return (
    <div className={css.listContainer}>
      <div className={css.searchWrapper} style={{ position: 'relative', marginBottom: '16px' }}>
        <input 
          type="text" 
          placeholder="Пошук клієнта..." 
          value={searchValue} 
          onChange={(e) => setSearchValue(e.target.value)}
          className={css.mobileSearchInput}
          style={{
            width: '100%',
            padding: '12px 40px 12px 16px',
            outline: 'none',
            fontSize: '16px'
          }}
        />
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          {searchValue ? (
            <button 
              onClick={() => setSearchValue('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          ) : (
            <Search size={20} style={{ color: 'var(--accent-green)', opacity: 0.6 }} />
          )}
        </div>
      </div>
      {clients?.map((client) => (
        <Link key={client.id} href={`/orders/${client.id}`} className={css.ref}>
          <div className={css.listItemButton}>
            <span>{client.client}</span>
            <span style={{ opacity: 0.3 }}>›</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Orders() {
  const initData = useInitData((state: InitData) => state.initData);

  return (
    <>
      {initData ? (
        <>
            <div className={css.desktopOnly} style={{height: '100%'}}>
                 <OrdersDashboard initData={initData} />
            </div>
            <div className={css.mobileOnly}>
                 <OrdersMobile initData={initData} />
            </div>
        </>
      ) : (
        <div style={{ padding: "20px" }}>Завантаження...</div>
      )}
    </>
  );
}

export default Orders;
