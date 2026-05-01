'use client'

import { useRef, useEffect, useMemo } from "react";
import css from "./StatusFilter.module.css";
import { useMapControlStore } from "../../store/mapControlStore";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getStatusColor } from "../../statusUtils";

export default function StatusFilter() {
    const { selectedStatuses, toggleStatus, availableStatuses, setSelectedStatuses, selectedDates } = useMapControlStore();
    const { deliveries, selectedManagers } = useApplicationsStore();
    const scrollRef = useRef(null);

    // Calculate counts for each status based on current filters (except status itself)
    const statusCounts = useMemo(() => {
        const counts = { all: 0 };
        
        // Filter deliveries by other active filters (manager and date)
        const filteredByOther = deliveries.filter(d => {
            const managerMatch = selectedManagers.length === 0 || selectedManagers.includes(d.manager);
            const dateMatch = selectedDates.length === 0 || selectedDates.includes(d.delivery_date || "Без дати");
            return managerMatch && dateMatch;
        });

        filteredByOther.forEach(d => {
            const status = d.status || "Без статусу";
            counts[status] = (counts[status] || 0) + 1;
            counts.all++;
        });

        return counts;
    }, [deliveries, selectedManagers, selectedDates]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e) => {
            if (e.deltaY === 0) return;
            // Prevent vertical page scroll when scrolling over the horizontal container
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [availableStatuses]);

    if (!availableStatuses || availableStatuses.length === 0) return null;

    const isAllSelected = selectedStatuses.length === availableStatuses.length;

    const handleSelectAll = (e) => {
        e.stopPropagation();
        if (isAllSelected) {
            setSelectedStatuses([]);
        } else {
            setSelectedStatuses(availableStatuses);
        }
    };

    return (
        <div className={css.container} ref={scrollRef}>
            <button 
                className={`${css.button} ${isAllSelected ? css.buttonActive : ''}`}
                onClick={handleSelectAll}
                data-text="Усі"
                style={{ 
                    '--status-color': 'var(--accent-green)',
                    '--status-glow': 'rgba(14, 241, 142, 0.2)'
                }}
            >
                Усі
                {statusCounts.all > 0 && (
                    <span className={css.badge}>{statusCounts.all}</span>
                )}
            </button>
            {availableStatuses.map((status) => {
                const isActive = Array.isArray(selectedStatuses) && selectedStatuses.includes(status);
                const color = getStatusColor(status);
                const count = statusCounts[status] || 0;
                
                return (
                    <button 
                        className={`${css.button} ${isActive ? css.buttonActive : ''}`} 
                        key={status} 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(status);
                        }}
                        data-text={status}
                        style={{ 
                            '--status-color': color,
                            '--status-glow': `${color}44`
                        }}
                    >
                        {status}
                        {count > 0 && (
                            <span className={css.badge}>{count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    )
}
