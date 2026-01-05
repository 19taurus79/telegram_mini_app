'use client'

import { useEffect, useState } from "react"
import { fetchManagers } from "../../fetchManagers";
import css from "./ManagerFilter.module.css";
import { useApplicationsStore } from "../../store/applicationsStore";

interface Manager {
    id: number;
    manager: string;
}

export default function ManagerFilter() {
    const [managers, setManagers] = useState<Manager[]>([]);
    const { selectedManager, setSelectedManager } = useApplicationsStore();

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
        if (selectedManager === manager) {
            setSelectedManager(null);
        } else {
            setSelectedManager(manager);
        }
    };

    return (
        <div className={css.container}>
            {managers.map((manager: Manager, index: number) => (
                <button 
                    className={selectedManager === manager.manager ? css.buttonActive : css.button} 
                    key={`${manager.id}-${index}`} 
                    onClick={() => handleButtonClick(manager.manager)}
                >
                    {manager.manager.split(' ').slice(0, 1).join(' ')}
                </button>
            ))}
        </div>
    )
}