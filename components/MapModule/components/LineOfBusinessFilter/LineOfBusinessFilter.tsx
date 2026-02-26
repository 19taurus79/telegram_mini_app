'use client'

import { useMemo } from "react"
import css from "./LineOfBusinessFilter.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";
import { Order } from "../../../../types/types";

interface Application {
    orders?: Order[];
    [key: string]: unknown;
}

export default function LineOfBusinessFilter() {
    const { applications, unmappedApplications, selectedLoBs, toggleLoB } = useApplicationsStore();

    const uniqueLoBs = useMemo(() => {
        const lobs = new Set<string>();
        
        (applications as Application[]).forEach(app => {
            app.orders?.forEach(order => {
                if (order.line_of_business) lobs.add(order.line_of_business);
            });
        });

        (unmappedApplications as Application[]).forEach(app => {
            app.orders?.forEach(order => {
                if (order.line_of_business) lobs.add(order.line_of_business);
            });
        });

        return Array.from(lobs).sort();
    }, [applications, unmappedApplications]);

    const handleButtonClick = (lob: string) => {
        toggleLoB(lob);
    };

    if (uniqueLoBs.length === 0) return null;

    return (
        <div className={css.container}>
            {uniqueLoBs.map((lob, index) => (
                <button 
                    className={selectedLoBs.includes(lob) ? css.buttonActive : css.button} 
                    key={`${lob}-${index}`} 
                    onClick={() => handleButtonClick(lob)}
                >
                    {lob}
                </button>
            ))}
        </div>
    )
}
