'use client'

import { useMemo } from "react"
import css from "./LineOfBusinessFilter.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { getAvailableLoBs, cleanString, ApplicationItem } from "../../utils/filterUtils";

export default function LineOfBusinessFilter() {
    const { 
        applications, 
        unmappedApplications, 
        selectedLoBs, 
        selectedManagers,
        toggleLoB 
    } = useApplicationsStore();

    const uniqueLoBs = useMemo(() => {
        return getAvailableLoBs(
            applications as ApplicationItem[], 
            unmappedApplications as ApplicationItem[], 
            selectedManagers
        );
    }, [applications, unmappedApplications, selectedManagers]);

    const isLobSelected = (lob: string) => {
        const cleanLob = cleanString(lob).toLowerCase();
        return (selectedLoBs as string[]).some(s => cleanString(s).toLowerCase() === cleanLob);
    };

    const handleButtonClick = (lob: string) => {
        toggleLoB(lob);
    };

    if (uniqueLoBs.length === 0) {
        return (
            <div className={css.container}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>
                    Немає даних про види діяльності
                </span>
            </div>
        );
    }

    return (
        <div className={css.container}>
            {uniqueLoBs.map((lob, index) => (
                <button 
                    className={`${css.button} ${isLobSelected(lob) ? css.buttonActive : ''}`} 
                    key={`${lob}-${index}`} 
                    onClick={() => handleButtonClick(lob)}
                    data-text={lob}
                >
                    {lob}
                </button>
            ))}
        </div>
    )
}
