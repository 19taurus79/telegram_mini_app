'use client'

import { useEffect, useState, useRef } from "react"
import { fetchManagers } from "../../fetchManagers";
import css from "./ManagerFilter.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";

interface Manager {
    id: number;
    manager: string;
}

export default function ManagerFilter() {
    const [managers, setManagers] = useState<Manager[]>([]);
    const { selectedManagers, toggleManager } = useApplicationsStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [managers]);

    useEffect(()=>{
        const getManagers = async () => {
            const data = await fetchManagers();
            if (data) {
                setManagers(data);
            }
        };
        getManagers();
    },[])

    const handleButtonClick = (manager: string) => {
        toggleManager(manager);
    };

    return (
        <div className={css.container} ref={scrollRef}>
            {managers.map((manager: Manager, index: number) => (
                <button 
                    className={`${css.button} ${selectedManagers.includes(manager.manager) ? css.buttonActive : ''}`} 
                    key={`${manager.id}-${index}`} 
                    onClick={() => handleButtonClick(manager.manager)}
                    data-text={manager.manager.split(' ').slice(0, 1).join(' ')}
                >
                    {manager.manager.split(' ').slice(0, 1).join(' ')}
                </button>
            ))}
        </div>
    )
}