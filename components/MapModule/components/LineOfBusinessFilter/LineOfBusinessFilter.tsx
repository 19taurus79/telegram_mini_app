'use client'

import { useMemo } from "react"
import css from "./LineOfBusinessFilter.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";

interface Order {
    line_of_business?: string;
    [key: string]: any;
}

interface Application {
    orders?: Order[];
    [key: string]: any;
}

export default function LineOfBusinessFilter() {
    const { applications, unmappedApplications, selectedLoB, setSelectedLoB } = useApplicationsStore();

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
        if (selectedLoB === lob) {
            setSelectedLoB(null);
        } else {
            setSelectedLoB(lob);
        }
    };

    if (uniqueLoBs.length === 0) return null;

    return (
        <div className={css.container}>
            {uniqueLoBs.map((lob, index) => (
                <button 
                    className={selectedLoB === lob ? css.buttonActive : css.button} 
                    key={`${lob}-${index}`} 
                    onClick={() => handleButtonClick(lob)}
                >
                    {lob as string}
                </button>
            ))}
        </div>
    )
}
