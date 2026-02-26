"use client";

import { useInitData } from "@/store/InitData";
import { InitData } from "@/store/InitData";
import OrdersDashboard from "@/components/Orders/OrdersDashboard/OrdersDashboard";
import { useFilter } from "@/context/FilterContext";
import Link from "next/link";
import css from "./Orders.module.css";
import { getClients } from "@/lib/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

// Old mobile version component
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
      <div style={{ padding: '10px 16px', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Пошук клієнта..." 
          value={searchValue} 
          onChange={(e) => setSearchValue(e.target.value)}
          className={css.mobileSearchInput}
          style={{
            width: '100%',
            padding: '10px 36px 10px 10px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            outline: 'none',
            fontSize: '16px'
          }}
        />
        {searchValue && (
          <button 
            onClick={() => setSearchValue('')}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        )}
      </div>
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
