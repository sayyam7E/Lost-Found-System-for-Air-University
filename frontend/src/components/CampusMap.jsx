import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Loader2, AlertCircle, Package } from 'lucide-react';
import { getAllItems } from '../api';

// Air University E9 Campus Center Coordinates (Islamabad, Pakistan)
const CAMPUS_CENTER = {
    lat: 33.6445,  // Actual Air University E9 location
    lng: 73.0702
};

// Campus boundary - restrict map to Air University E9 ONLY
const CAMPUS_BOUNDS = {
    north: 33.6460,  // Northern boundary of AU E9
    south: 33.6430,  // Southern boundary of AU E9
    east: 73.0720,   // Eastern boundary of AU E9
    west: 73.0684    // Western boundary of AU E9
};

// Campus building coordinates - ALL within Air University E9 campus
const BUILDING_COORDINATES = {
    'library': { lat: 33.6448, lng: 73.0695, name: 'Central Library' },
    'cafeteria': { lat: 33.6442, lng: 73.0705, name: 'Main Cafeteria' },
    'gym': { lat: 33.6452, lng: 73.0710, name: 'Sports Complex' },
    'admin': { lat: 33.6440, lng: 73.0698, name: 'Admin Block' },
    'classroom': { lat: 33.6446, lng: 73.0692, name: 'Academic Block A' },
    'parking': { lat: 33.6455, lng: 73.0715, name: 'Main Parking' },
    'dorm': { lat: 33.6435, lng: 73.0712, name: 'Hostel Building' },
    'lab': { lat: 33.6450, lng: 73.0700, name: 'Engineering Labs' },
};

const mapContainerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '16px',
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,  // Allow map/satellite toggle
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeId: 'roadmap',  // Default to road map
    minZoom: 17,  // Prevent zooming out - keeps campus in view
    maxZoom: 20,  // Allow close-up view
    restriction: {
        latLngBounds: CAMPUS_BOUNDS,
        strictBounds: true  // STRICT: Cannot pan outside Air University E9
    },
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        },
        {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        }
    ]
};

function CampusMap() {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapRef, setMapRef] = useState(null);

    // Load Google Maps
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUqqo6YBqNBqRnEIcQ',
        libraries: ['places']
    });

    const onMapLoad = useCallback((map) => {
        setMapRef(map);
        // Keep strict campus bounds - DO NOT call fitBounds!
        // Map will use center and zoom from props
    }, []);

    useEffect(() => {
        fetchItems();
        // Refresh items every 10 seconds
        const interval = setInterval(fetchItems, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await getAllItems();
            setItems(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching items:', err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const getMarkerPosition = (location) => {
        const locationKey = location.toLowerCase();
        return BUILDING_COORDINATES[locationKey] || CAMPUS_CENTER;
    };

    const getMarkerIcon = (item) => {
        // Create custom blinking marker icons
        const color = item.type === 'lost' ? '#ef4444' : '#10b981'; // red for lost, green for found
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 12,
        };
    };

    if (loadError) {
        return (
            <div className="glass-card p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl font-bold text-white mb-2">Map Loading Error</h3>
                <p className="text-gray-400">Failed to load Google Maps. Please check your API key.</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="glass-card p-8 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
                <p className="text-gray-400">Loading campus map...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Map Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold gradient-text mb-2">Campus Map</h2>
                    <p className="text-gray-400">
                        Air University E9 - View where items were lost and found
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    disabled={loading}
                    className="glass-button px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Legend */}
            <div className="glass-card p-4 flex flex-wrap gap-6 items-center justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-sm text-gray-300">
                        🔴 <strong className="text-red-400">Lost Items</strong> - Where items were lost ({items.filter(i => i.type === 'lost').length})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm text-gray-300">
                        🟢 <strong className="text-green-400">Found Items</strong> - Where items were found ({items.filter(i => i.type === 'found').length})
                    </span>
                </div>
            </div>

            {error && (
                <div className="glass-card p-4 bg-red-500/10 border-red-500/30 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300">{error}</span>
                </div>
            )}

            {/* Google Map */}
            <div className="glass-card p-2 overflow-hidden">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={CAMPUS_CENTER}
                    zoom={17}
                    options={mapOptions}
                    onLoad={onMapLoad}
                >
                    {/* Render markers for each item */}
                    {items.map((item) => {
                        const position = getMarkerPosition(item.location);
                        return (
                            <BlinkingMarker
                                key={item.id}
                                position={position}
                                item={item}
                                onClick={() => setSelectedItem(item)}
                            />
                        );
                    })}

                    {/* Info Window for selected item */}
                    {selectedItem && (
                        <InfoWindow
                            position={getMarkerPosition(selectedItem.location)}
                            onCloseClick={() => setSelectedItem(null)}
                        >
                            <div className="p-3 max-w-xs bg-gray-900 text-white rounded-lg">
                                <div className="flex items-start gap-3 mb-2">
                                    <Package className={`w-6 h-6 ${selectedItem.type === 'lost' ? 'text-red-400' : 'text-green-400'}`} />
                                    <div>
                                        <h3 className="font-bold text-lg capitalize">{selectedItem.name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedItem.type === 'lost'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {selectedItem.type.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm text-gray-300">
                                    {selectedItem.color && (
                                        <p><strong>Color:</strong> {selectedItem.color}</p>
                                    )}
                                    <p><strong>Location:</strong> {BUILDING_COORDINATES[selectedItem.location.toLowerCase()]?.name || selectedItem.location}</p>
                                    <p><strong>Owner:</strong> {selectedItem.owner}</p>
                                    {selectedItem.description && (
                                        <p><strong>Description:</strong> {selectedItem.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                        {new Date(selectedItem.timestamp * 1000).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </div>

            {/* Items List */}
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recent Items on Map</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.slice(0, 6).map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setSelectedItem(item);
                                if (mapRef) {
                                    const position = getMarkerPosition(item.location);
                                    mapRef.panTo(position);
                                    mapRef.setZoom(18);
                                }
                            }}
                            className="p-4 glass cursor-pointer hover:bg-white/10 rounded-lg transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-3 h-3 rounded-full mt-1 animate-pulse ${item.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
                                    }`}></div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-white capitalize">{item.name}</h4>
                                    <p className="text-sm text-gray-400">{BUILDING_COORDINATES[item.location.toLowerCase()]?.name || item.location}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Custom Blinking Marker Component
function BlinkingMarker({ position, item, onClick }) {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setOpacity(prev => prev === 1 ? 0.3 : 1);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    const color = item.type === 'lost' ? '#ef4444' : '#10b981';

    return (
        <Marker
            position={position}
            onClick={onClick}
            icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: opacity,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 12,
            }}
            animation={window.google.maps.Animation.DROP}
        />
    );
}

export default CampusMap;
