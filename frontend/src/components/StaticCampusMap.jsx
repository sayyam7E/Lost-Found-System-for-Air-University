import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Package, MapPin, X, Navigation } from 'lucide-react';
import { getAllItems } from '../api';

// Campus building positions - mapped to blueprint coordinates
// Each position is relative to the map image (percentage-based for responsiveness)
// CORRECTED Y-values - moved DOWN significantly based on screenshot analysis
const BUILDING_POSITIONS = {
    // TOP ROW - moved DOWN significantly (Y increased by 10-15%)
    'fmc-hostel': { x: 6, y: 18, name: 'F.M.C Hostel', icon: '🏨' },        // 1) Inside FMC Hostel
    'basketball': { x: 20, y: 20, name: 'Basket Ball Ground', icon: '🏀' }, // 2) Inside basketball
    'prayer-area': { x: 35, y: 18, name: 'Prayer Area', icon: '🕌' },      // 3) Mosque - moved right into square
    'mini-office': { x: 47, y: 20, name: 'Mini Office Block', icon: '🏢' },
    'ausom': { x: 57, y: 24, name: 'Ausom', icon: '🎓' },
    'fmc-building': { x: 71, y: 24, name: 'FMC Building', icon: '🏛️' },   // 6) Inside FMC Building
    'fmc-lawn': { x: 88, y: 20, name: 'FMC Lawn', icon: '🌳' },            // 7) Inside FMC Lawn
    'green-area-north': { x: 80, y: 32, name: 'Green Area', icon: '🌿' }, // 8) Inside Green Area

    // SECOND ROW - moved DOWN
    'pre-fab': { x: 22, y: 32, name: 'Pre-Fabricated Block', icon: '🏗️' }, // 4) Inside Pre-Fab Block
    'b-block': { x: 43, y: 32, name: 'B-Block', icon: '🅱️' },

    // THIRD ROW - moved DOWN
    'a-block': { x: 32, y: 52, name: 'A-Block', icon: '🅰️' },
    'admin': { x: 47, y: 58, name: 'Admin Block', icon: '🏛️' },
    'green-area': { x: 58, y: 52, name: 'Green Area', icon: '🌳' },
    'iaa': { x: 70, y: 58, name: 'I.A.A', icon: '📊' },
    'cafeteria': { x: 90, y: 46, name: 'Cafeteria', icon: '🍽️' },         // 9) Inside Cafeteria
    'auditorium': { x: 92, y: 56, name: 'Auditorium Library', icon: '📚' }, // 9) Inside Auditorium

    // FOURTH ROW - moved DOWN
    'c-block': { x: 12, y: 52, name: 'C-Block', icon: '🅲' },              // Moved UP into C-Block area
    'sports': { x: 32, y: 78, name: 'Sports Complex', icon: '🏋️' },
    'main-office-lawn': { x: 46, y: 80, name: 'Main Office Lawn', icon: '🌿' },
    'ausom-lawn': { x: 56, y: 76, name: 'AUSOM Lawn', icon: '🌺' },
    'iaa-lawn-2': { x: 70, y: 72, name: 'IAA Lawn-2', icon: '🌴' },        // Adjusted into IAA Lawn-2 area
    'iaa-lawn-1': { x: 79, y: 76, name: 'IAA Lawn-1', icon: '🌴' },        // 5) Inside IAA Lawn-1

    // BOTTOM ROW
    'parking': { x: 52, y: 92, name: 'Students Parking', icon: '🚗' },
    'main-gate': { x: 94, y: 96, name: 'Main Gate', icon: '🚪' },          // 10) At entrance/gate
};

function StaticCampusMap() {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [hoveredBuilding, setHoveredBuilding] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);

    useEffect(() => {
        fetchItems();
        const interval = setInterval(fetchItems, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setMapLoaded(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await getAllItems();
            setItems(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching items:', err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const validItems = items.filter(item => {
        if (!item || !item.location) return false;
        return BUILDING_POSITIONS[item.location.toLowerCase()] !== undefined;
    });

    const getItemsAtBuilding = (buildingKey) => {
        return validItems.filter(item =>
            item.location.toLowerCase() === buildingKey.toLowerCase()
        );
    };

    const handleBuildingClick = (key) => {
        setSelectedBuilding(key);
        const itemsHere = getItemsAtBuilding(key);
        if (itemsHere.length > 0) {
            setSelectedItem(itemsHere[0]);
        } else {
            setSelectedItem(null);
        }
    };

    const closeModal = () => {
        setSelectedBuilding(null);
        setSelectedItem(null);
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className={`transition-all duration-500 ${mapLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
                                <Navigation className="w-8 h-8 text-purple-400" />
                                Interactive Campus Map
                            </h2>
                            <p className="text-gray-400 mt-1">
                                Click on any location to view lost & found items
                            </p>
                        </div>
                        <button
                            onClick={fetchItems}
                            disabled={loading}
                            className="px-4 py-2 glass-button rounded-xl flex items-center gap-2"
                        >
                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className={`transition-all duration-500 delay-100 ${mapLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap gap-6 items-center justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-sm text-gray-300">
                            <strong className="text-red-400">Lost</strong> ({validItems.filter(i => i.type === 'lost').length})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-gray-300">
                            <strong className="text-green-400">Found</strong> ({validItems.filter(i => i.type === 'found').length})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-purple-500/50 border-2 border-purple-400"></div>
                        <span className="text-sm text-gray-300">Locations ({Object.keys(BUILDING_POSITIONS).length})</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300">{error}</span>
                </div>
            )}

            {/* Map Container with Blueprint Image */}
            <div className={`transition-all duration-500 delay-200 ${mapLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="backdrop-blur-xl bg-gray-900/80 border-2 border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Status Bar */}
                    <div className="h-12 bg-gradient-to-r from-purple-900/80 to-cyan-900/80 border-b border-white/10 flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-sm text-green-400 font-mono">LIVE</span>
                        </div>
                        <span className="text-sm text-white font-semibold tracking-wider">AIR UNIVERSITY CAMPUS MAP</span>
                        <span className="text-sm text-purple-400 font-mono">{validItems.length} Items Tracked</span>
                    </div>

                    {/* Blueprint Map with Interactive Markers */}
                    <div className="relative w-full" style={{ aspectRatio: '1024/768' }}>
                        {/* Blueprint Image - using object-fill for proper marker alignment */}
                        <img
                            src="/campus-map.png"
                            alt="Campus Map Blueprint"
                            className="absolute inset-0 w-full h-full"
                            style={{ objectFit: 'fill' }}
                        />

                        {/* Decorative Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-cyan-900/10 pointer-events-none"></div>

                        {/* Interactive Location Markers */}
                        {Object.entries(BUILDING_POSITIONS).map(([key, building]) => {
                            const isHovered = hoveredBuilding === key;
                            const isSelected = selectedBuilding === key;
                            const itemsHere = getItemsAtBuilding(key);
                            const hasLost = itemsHere.some(i => i.type === 'lost');
                            const hasFound = itemsHere.some(i => i.type === 'found');
                            const hasItems = itemsHere.length > 0;

                            return (
                                <div
                                    key={key}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10
                                        ${isHovered || isSelected ? 'scale-125 z-20' : 'hover:scale-110'}`}
                                    style={{ left: `${building.x}%`, top: `${building.y}%` }}
                                    onMouseEnter={() => setHoveredBuilding(key)}
                                    onMouseLeave={() => setHoveredBuilding(null)}
                                    onClick={() => handleBuildingClick(key)}
                                >
                                    {/* Marker Container */}
                                    <div className={`relative flex flex-col items-center`}>
                                        {/* Pulse effect for locations with items */}
                                        {hasItems && (
                                            <div className={`absolute w-10 h-10 rounded-full animate-ping opacity-40 
                                                ${hasLost ? 'bg-red-500' : 'bg-green-500'}`}
                                            ></div>
                                        )}

                                        {/* Main Marker */}
                                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg
                                            shadow-lg border-2 transition-all
                                            ${isHovered || isSelected
                                                ? 'bg-purple-600 border-white shadow-purple-500/50'
                                                : hasItems
                                                    ? hasLost
                                                        ? 'bg-red-600/90 border-red-400'
                                                        : 'bg-green-600/90 border-green-400'
                                                    : 'bg-gray-800/90 border-purple-400/50 hover:border-purple-400'
                                            }`}
                                        >
                                            {building.icon}
                                        </div>

                                        {/* Item Count Badge */}
                                        {hasItems && (
                                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                                                ${hasLost ? 'bg-red-500' : 'bg-green-500'}`}>
                                                {itemsHere.length}
                                            </div>
                                        )}

                                        {/* Label on hover */}
                                        {(isHovered || isSelected) && (
                                            <div className="absolute top-12 bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-xl border border-purple-500/50 whitespace-nowrap z-30">
                                                <span className="text-white text-sm font-medium">{building.name}</span>
                                                {hasItems && (
                                                    <span className={`ml-2 text-xs ${hasLost ? 'text-red-400' : 'text-green-400'}`}>
                                                        ({itemsHere.length} items)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal for Building Details */}
            {selectedBuilding && (() => {
                const building = BUILDING_POSITIONS[selectedBuilding];
                const itemsHere = getItemsAtBuilding(selectedBuilding);

                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
                        onClick={closeModal}
                    >
                        <div
                            className="w-full max-w-lg bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/50 border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                            style={{ animation: 'modalIn 0.2s ease-out' }}
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-purple-600/40 to-cyan-600/40 p-5 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{building.icon}</span>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{building.name}</h3>
                                            <p className="text-gray-400 text-sm">
                                                {itemsHere.length} item(s) at this location
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 max-h-[400px] overflow-y-auto">
                                {itemsHere.length > 0 ? (
                                    <div className="space-y-3">
                                        {itemsHere.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                                className={`p-4 rounded-xl cursor-pointer transition-all ${selectedItem?.id === item.id
                                                    ? 'bg-purple-500/30 border-2 border-purple-500'
                                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'lost' ? 'bg-red-500/20' : 'bg-green-500/20'
                                                        }`}>
                                                        <Package className={`w-5 h-5 ${item.type === 'lost' ? 'text-red-400' : 'text-green-400'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-white capitalize">{item.name}</h4>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'lost'
                                                                ? 'bg-red-500/20 text-red-400'
                                                                : 'bg-green-500/20 text-green-400'
                                                                }`}>
                                                                {item.type.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        {item.color && (
                                                            <p className="text-sm text-gray-400 mt-1">Color: {item.color}</p>
                                                        )}
                                                        <p className="text-sm text-gray-400">Reported by: {item.owner}</p>
                                                        {selectedItem?.id === item.id && item.description && (
                                                            <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-white/10">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <MapPin className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                                        <p className="text-gray-400 text-lg">No items reported here</p>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Items lost or found at this location will appear here
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-black/30 p-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Recent Activity Section */}
            <div className={`transition-all duration-500 delay-300 ${mapLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-xl">🕐</span> Recent Activity
                    </h3>
                    {validItems.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {validItems.slice(0, 6).map(item => {
                                const pos = BUILDING_POSITIONS[item.location?.toLowerCase()];
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleBuildingClick(item.location.toLowerCase())}
                                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${item.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
                                                }`}></div>
                                            <div>
                                                <p className="font-medium text-white capitalize">{item.name}</p>
                                                <p className="text-xs text-gray-400">{pos?.name || item.location}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No recent activity to display</p>
                    )}
                </div>
            </div>

            {/* Animation Styles */}
            <style jsx>{`
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}

export default StaticCampusMap;
