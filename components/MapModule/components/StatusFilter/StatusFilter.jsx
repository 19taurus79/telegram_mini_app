'use client'

import { useRef, useEffect } from "react";
import css from "./StatusFilter.module.css";
import { useMapControlStore } from "../../store/mapControlStore";
import { getStatusColor } from "../../statusUtils";

export default function StatusFilter() {
    const { selectedStatuses, toggleStatus, availableStatuses, setSelectedStatuses } = useMapControlStore();
    const scrollRef = useRef(null);

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
            </button>
            {availableStatuses.map((status) => {
                const isActive = Array.isArray(selectedStatuses) && selectedStatuses.includes(status);
                const color = getStatusColor(status);
                
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
                    </button>
                );
            })}
        </div>
    )
}
