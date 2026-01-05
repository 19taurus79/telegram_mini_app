import css from './MapControls.module.css';

export default function MapControls({ 
  areApplicationsVisible, 
  toggleApplications, 
  showHeatmap, 
  toggleHeatmap,
  areClientsVisible,
  toggleClients,
  areDeliveriesVisible,
  toggleDeliveries,
  isRoutingMode,
  toggleRoutingMode
}) {
  return (
    <div className={css.controlsPanel}>
      {/* Clients Toggle */}
      <div 
        className={css.controlBtn}
        onClick={toggleClients}
        title={areClientsVisible ? 'Скрити контрагентів' : 'Показати контрагентів'}
        style={{
          background: areClientsVisible ? '#4caf50' : 'white',
          color: areClientsVisible ? 'white' : 'black',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span className={css.tooltip}>
          {areClientsVisible ? 'Скрити контрагентів' : 'Показати контрагентів'}
        </span>
      </div>

      {/* Deliveries Toggle */}
      <div 
        className={css.controlBtn}
        onClick={toggleDeliveries}
        title={areDeliveriesVisible ? 'Приховати доставки' : 'Показати доставки'}
        style={{
          background: areDeliveriesVisible ? '#ff5722' : 'white',
          color: areDeliveriesVisible ? 'white' : 'black',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M42 32V19H33V9H6V32" />
            <path d="M6 32H13.6829M42 32H35.8049M23.3659 32H13.6829M23.3659 32H35.8049" />
            <circle cx="18.5" cy="35" r="3.5" />
            <circle cx="31" cy="35" r="3.5" />
            <path d="M33 19H42L37.8 13H33V19Z" fill="currentColor" />
        </svg>
        <span className={css.tooltip}>
          {areDeliveriesVisible ? 'Приховати доставки' : 'Показати доставки'}
        </span>
      </div>

      {/* Routing Toggle */}
      <div 
        className={css.controlBtn}
        onClick={toggleRoutingMode}
        title={isRoutingMode ? 'Вимкнути режим маршруту' : 'Увімкнути режим маршруту'}
        style={{
          background: isRoutingMode ? '#2196f3' : 'white',
          color: isRoutingMode ? 'white' : 'black',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="19" r="3"></circle>
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
          <circle cx="18" cy="5" r="3"></circle>
        </svg>
        <span className={css.tooltip}>
          {isRoutingMode ? 'Вимкнути режим маршруту' : 'Увімкнути режим маршруту'}
        </span>
      </div>

      {/* Applications Toggle */}
      <div 
        className={css.controlBtn}
        onClick={toggleApplications}
        title={areApplicationsVisible ? 'Приховати заявки' : 'Показати заявки'}
        style={{
          background: areApplicationsVisible ? '#4caf50' : 'white',
          color: areApplicationsVisible ? 'white' : 'black',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <span className={css.tooltip}>
          {areApplicationsVisible ? 'Приховати заявки' : 'Показати заявки'}
        </span>
      </div>

      {/* Heatmap Toggle - only visible when applications are shown */}
      {areApplicationsVisible && (
        <div 
          className={css.controlBtn}
          onClick={toggleHeatmap}
          title={showHeatmap ? 'Показати маркери' : 'Показати теплову карту'}
          style={{
            background: showHeatmap ? '#ff9800' : 'white',
            color: showHeatmap ? 'white' : 'black',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showHeatmap ? (
              <>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </>
            ) : (
              <>
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
              </>
            )}
          </svg>
          <span className={css.tooltip}>
            {showHeatmap ? 'Показати маркери' : 'Показати теплову карту'}
          </span>
        </div>
      )}
    </div>
  );
}
