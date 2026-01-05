export const STATUS_COLORS = {
    'created': '#2196f3',
    'открыт': '#2196f3',
    'новый': '#2196f3',
    'new': '#2196f3',
    
    'shipped': '#9c27b0',
    'в пути': '#9c27b0',
    'транзит': '#9c27b0',
    'on way': '#9c27b0',
    
    'delivered': '#4caf50',
    'доставлен': '#4caf50',
    'завершен': '#4caf50',
    'completed': '#4caf50',
    
    'pending': '#ff9800',
    'ожидает': '#ff9800',
    'в процессе': '#ff9800',
    'processing': '#ff9800',
    
    'cancelled': '#9e9e9e',
    'отменен': '#9e9e9e',
    'отказ': '#9e9e9e',
    'rejected': '#9e9e9e',
    
    // Ukrainian statuses
    'створено': '#2196f3',
    'в роботі': '#ff9800',
    'виконано': '#4caf50',
};

export const getStatusColor = (status) => {
    if (!status) return '#ff5722';
    const lowerStatus = status.toLowerCase();
    
    // Check direct matches
    if (STATUS_COLORS[lowerStatus]) return STATUS_COLORS[lowerStatus];
    
    // Check partial matches or sensible defaults
    if (lowerStatus.includes('нов') || lowerStatus.includes('creat') || lowerStatus.includes('створ')) return STATUS_COLORS['created'];
    if (lowerStatus.includes('пут') || lowerStatus.includes('ship') || lowerStatus.includes('транзит')) return STATUS_COLORS['shipped'];
    if (lowerStatus.includes('достав') || lowerStatus.includes('заверш') || lowerStatus.includes('complet') || lowerStatus.includes('виконан')) return STATUS_COLORS['delivered'];
    if (lowerStatus.includes('ожид') || lowerStatus.includes('процесс') || lowerStatus.includes('pend') || lowerStatus.includes('робот')) return STATUS_COLORS['pending'];
    if (lowerStatus.includes('отмен') || lowerStatus.includes('отказ') || lowerStatus.includes('cancel')) return STATUS_COLORS['cancelled'];
    
    return '#ff5722'; // Default Deep Orange
};
