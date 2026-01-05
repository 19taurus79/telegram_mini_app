'use client'

import css from "./StatusFilter.module.css";
import { useMapControlStore } from "../../store/mapControlStore";
import { getStatusColor } from "../../statusUtils";

export default function StatusFilter() {
    const { selectedStatuses, toggleStatus, availableStatuses, setSelectedStatuses } = useMapControlStore();

    if (!availableStatuses || availableStatuses.length === 0) return null;

    const isAllSelected = selectedStatuses.length === availableStatuses.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedStatuses([]);
        } else {
            setSelectedStatuses(availableStatuses);
        }
    };

    return (
        <div className={css.container}>
            <button 
                className={isAllSelected ? css.buttonActive : css.button}
                onClick={handleSelectAll}
            >
                Усі
            </button>
            {availableStatuses.map((status) => {
                const isActive = Array.isArray(selectedStatuses) && selectedStatuses.includes(status);
                const color = getStatusColor(status);
                
                return (
                    <button 
                        className={isActive ? css.buttonActive : css.button} 
                        key={status} 
                        onClick={() => toggleStatus(status)}
                        style={isActive ? { backgroundColor: color, borderColor: color } : { borderLeft: `4px solid ${color}` }}
                    >
                        {status}
                    </button>
                );
            })}
        </div>
    )
}
