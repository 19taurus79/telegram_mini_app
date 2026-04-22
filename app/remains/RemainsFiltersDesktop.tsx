"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, X, SlidersHorizontal, ChevronRight, 
  Shield, Sprout, FlaskConical, Droplets, Factory, CheckCircle2, Layers 
} from "lucide-react";
import { useFilter } from "@/context/FilterContext";
import styles from "./RemainsFiltersDesktop.module.css";
import Portal from "@/components/Portal";

interface Group {
  name: string;
  subGroups: string[];
}

interface RemainsFiltersDesktopProps {
  groups: Group[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "ЗЗР": <Shield size={16} />,
  "Насіння": <Sprout size={16} />,
  "Власне виробництво насіння": <Factory size={16} />,
  "Позакореневi добрива": <Droplets size={16} />,
  "Міндобрива (основні)": <FlaskConical size={16} />,
  "Всі": <CheckCircle2 size={16} />,
};

export default function RemainsFiltersDesktop({ groups }: RemainsFiltersDesktopProps) {
  const { 
    selectedGroup, setSelectedGroup, 
    selectedSubGroup, setSelectedSubGroup,
    searchValue, setSearchValue 
  } = useFilter();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  // Update popover position when opened
  useEffect(() => {
    if (isPopoverOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right - 280 + window.scrollX, // 280 is popover width
      });
    }
  }, [isPopoverOpen]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  // All categories for quick access (capsules), sorted to keep "Всі" first
  const quickCategories = [...groups].sort((a, b) => {
    if (a.name === "Всі") return -1;
    if (b.name === "Всі") return 1;
    return 0;
  });

  const getIcon = (name: string) => {
    return CATEGORY_ICONS[name] || <Layers size={16} />;
  };

  const handleGroupSelect = (groupName: string) => {
    const newValue = groupName === "Всі" ? "" : groupName;
    setSelectedGroup(newValue);
    setSelectedSubGroup("");
    setIsPopoverOpen(false);
  };

  const handleSubGroupSelect = (groupName: string, subName: string) => {
    setSelectedGroup(groupName);
    setSelectedSubGroup(subName);
    setIsPopoverOpen(false);
  };

  const activeFiltersCount = (selectedGroup ? 1 : 0) + (selectedSubGroup ? 1 : 0);


  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      // Блокируем скролл всей страницы, когда крутим над фильтрами
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Умножаем на 2 для скорости
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchRow}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Швидкий пошук товару за назвою..."
            className={styles.searchInput}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {searchValue && (
            <button
              className={styles.clearSearchBtn}
              onClick={() => setSearchValue("")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div style={{ position: "relative" }}>
          <button
            ref={buttonRef}
            className={`${styles.filterToggleBtn} ${selectedGroup ? styles.active : ""}`}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            title="Всі категорії"
          >
            <SlidersHorizontal size={22} />
            {activeFiltersCount > 0 && (
              <span className={styles.badge}>{activeFiltersCount}</span>
            )}
          </button>

          {isPopoverOpen && (
            <Portal>
              <div 
                className={styles.popoverContent} 
                ref={popoverRef}
                style={{
                  top: popoverCoords.top,
                  left: popoverCoords.left,
                  position: "absolute"
                }}
              >
                <div className={styles.popoverHeader}>Категорії та підгрупи</div>
                <ul className={styles.popoverList}>
                  {groups.map((group) => {
                    const isActive = (group.name === "Всі" && selectedGroup === "") || group.name === selectedGroup;
                    const isExpanded = expandedGroup === group.name;
                    
                    return (
                      <li key={group.name}>
                        <div
                          className={`${styles.popoverItem} ${isActive ? styles.popoverItemActive : ""}`}
                          onClick={() => {
                            if (group.subGroups.length > 0) {
                              setExpandedGroup(isExpanded ? null : group.name);
                            } else {
                              handleGroupSelect(group.name);
                            }
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {getIcon(group.name)}
                            <span>{group.name}</span>
                          </div>
                          {group.subGroups.length > 0 && (
                            <ChevronRight 
                              size={16} 
                              style={{ 
                                transform: isExpanded ? "rotate(90deg)" : "none",
                                transition: "transform 0.3s ease" 
                              }} 
                            />
                          )}
                        </div>
                        
                        {isExpanded && group.subGroups.length > 0 && (
                          <div className={styles.subGroupList}>
                            {group.subGroups.map(sub => (
                              <div 
                                key={sub} 
                                className={`${styles.subGroupItem} ${selectedSubGroup === sub ? styles.subGroupActive : ""}`}
                                onClick={() => handleSubGroupSelect(group.name, sub)}
                              >
                                {sub}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Portal>
          )}
        </div>
      </div>

      <div 
        className={`${styles.categoriesRow} ${isDragging ? styles.grabbing : ""}`} 
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {quickCategories.map((group) => {
          const isActive = (group.name === "Всі" && selectedGroup === "") || group.name === selectedGroup;
          return (
            <div
              key={group.name}
              className={`${styles.capsule} ${isActive ? styles.activeCapsule : ""}`}
              onClick={() => handleGroupSelect(group.name)}
            >
              {getIcon(group.name)}
              <span>{group.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
