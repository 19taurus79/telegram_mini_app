import css from './RoutePanel.module.css';
import { useState } from 'react';

export default function RoutePanel({ routeInfo, waypoints, onClear, onDeleteWaypoint, onMoveWaypoint, onOptimize, onToggleMode, isActive }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onMoveWaypoint(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleOptimizeClick = (method) => {
    onOptimize(method);
    setShowOptimizeDialog(false);
  };

  if (!isActive) return null;

  return (
    <div className={css.panel}>
      <div className={css.header}>
        <h3>📍 Маршрут</h3>
        <div className={css.headerButtons}>
          {waypoints && waypoints.length >= 2 && (
            <button 
              className={css.optimizeBtn} 
              onClick={() => setShowOptimizeDialog(!showOptimizeDialog)}
              title="Оптимізувати маршрут"
            >
              ⚡
            </button>
          )}
          {waypoints && waypoints.length > 0 && (
            <button 
              className={css.clearBtn} 
              onClick={onClear}
              title="Очистити маршрут"
            >
              🗑️
            </button>
          )}
          <button 
            className={css.closeBtn} 
            onClick={onToggleMode}
            title="Вимкнути режим маршруту"
          >
            ✕
          </button>
        </div>
      </div>

      {showOptimizeDialog && (
        <div className={css.optimizeDialog}>
          <div className={css.dialogTitle}>Оберіть метод оптимізації:</div>
          <button 
            className={css.optimizeOption}
            onClick={() => handleOptimizeClick('nearest')}
          >
            <div className={css.optionTitle}>🎯 Найближчий сусід</div>
            <div className={css.optionDesc}>Швидкий алгоритм, вибирає найближчу точку</div>
          </button>
          <button 
            className={css.optimizeOption}
            onClick={() => handleOptimizeClick('shortest')}
          >
            <div className={css.optionTitle}>📏 Найкоротший шлях</div>
            <div className={css.optionDesc}>2-opt алгоритм, мінімізує загальну відстань</div>
          </button>
          <button 
            className={css.optimizeOption}
            onClick={() => handleOptimizeClick('reverse')}
          >
            <div className={css.optionTitle}>🔄 Реверс</div>
            <div className={css.optionDesc}>Змінює порядок точок на протилежний</div>
          </button>
        </div>
      )}

      {waypoints && waypoints.length > 0 && (
        <div className={css.waypoints}>
          {waypoints.map((waypoint, index) => {
            const isStart = index === 0;
            const isEnd = index === waypoints.length - 1;
            let markerColor = '#3b82f6'; // blue for intermediate
            let markerLabel = index + 1;
            
            if (isStart) {
              markerColor = '#22c55e'; // green
              markerLabel = 'A';
            } else if (isEnd) {
              markerColor = '#ef4444'; // red
              markerLabel = 'B';
            }
            
            return (
              <div 
                key={index} 
                className={`${css.waypointContainer} ${draggedIndex === index ? css.dragging : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className={css.dragHandle}>⋮⋮</div>
                <div className={css.waypoint}>
                  <span className={css.marker} style={{ backgroundColor: markerColor }}>
                    {markerLabel}
                  </span>
                  <div className={css.waypointInfo}>
                    <span className={css.label}>
                      {waypoint.name || `Точка ${index + 1}`}
                    </span>
                    {waypoint.type && (
                      <span className={css.type}>({waypoint.type})</span>
                    )}
                  </div>
                </div>
                <div className={css.actions}>
                  {index > 0 && (
                    <button 
                      className={css.actionBtn}
                      onClick={() => onMoveWaypoint(index, index - 1)}
                      title="Вгору"
                    >
                      ↑
                    </button>
                  )}
                  {index < waypoints.length - 1 && (
                    <button 
                      className={css.actionBtn}
                      onClick={() => onMoveWaypoint(index, index + 1)}
                      title="Вниз"
                    >
                      ↓
                    </button>
                  )}
                  <button 
                    className={css.deleteBtn}
                    onClick={() => onDeleteWaypoint(index)}
                    title="Видалити"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {routeInfo && (
        <div className={css.info}>
          <div className={css.infoItem}>
            <span className={css.icon}>🛣️</span>
            <div>
              <div className={css.value}>{routeInfo.distance} км</div>
              <div className={css.sublabel}>Расстояние</div>
            </div>
          </div>
          <div className={css.infoItem}>
            <span className={css.icon}>⏱️</span>
            <div>
              <div className={css.value}>{routeInfo.time} мин</div>
              <div className={css.sublabel}>Время в пути</div>
            </div>
          </div>
        </div>
      )}

      {!routeInfo && waypoints && waypoints.length < 2 && (
        <div className={css.hint}>
          {waypoints.length === 0 
            ? 'Кликните на маркер для выбора начальной точки'
            : 'Кликните на маркер для выбора конечной точки'}
        </div>
      )}
    </div>
  );
}
