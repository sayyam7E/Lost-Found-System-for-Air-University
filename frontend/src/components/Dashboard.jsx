import { useState, useEffect } from 'react';
import {
    Package, Clock, MapPin, User, RefreshCw, Loader2,
    AlertTriangle, CheckCircle, Search as SearchIcon, MoreVertical, Trash2, X, Gift, Phone
} from 'lucide-react';
import { getHistory, getStats, getLostItems, getFoundItems, deleteItem, claimItem } from '../api';
import StatsDashboard from './StatsDashboard';

function Dashboard() {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ totalItems: 0, lostItems: 0, foundItems: 0 });
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [claimConfirm, setClaimConfirm] = useState(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimName, setClaimName] = useState('');
    const [claimPhone, setClaimPhone] = useState('');

    useEffect(() => {
        fetchData();
    }, [filter]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [statsData, itemsData] = await Promise.all([
                getStats(),
                filter === 'lost' ? getLostItems() :
                    filter === 'found' ? getFoundItems() :
                        getHistory()
            ]);

            setStats(statsData);
            setItems(itemsData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to connect to server. Is the C++ backend running on port 8080?');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (itemId) => {
        setIsDeleting(true);
        try {
            await deleteItem(itemId);
            // Remove item from local state immediately
            setItems(items.filter(item => item.id !== itemId));
            // Update stats
            setStats(prev => ({
                ...prev,
                totalItems: prev.totalItems - 1,
                lostItems: deleteConfirm?.type === 'lost' ? prev.lostItems - 1 : prev.lostItems,
                foundItems: deleteConfirm?.type === 'found' ? prev.foundItems - 1 : prev.foundItems
            }));
            setDeleteConfirm(null);
            setOpenMenuId(null);
        } catch (err) {
            console.error('Failed to delete item:', err);
            setError('Failed to delete item. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClaim = async () => {
        if (!claimName.trim()) {
            setError('Please enter your name to claim this item.');
            return;
        }
        if (!claimPhone.trim()) {
            setError('Please enter your phone number to claim this item.');
            return;
        }
        setIsClaiming(true);
        try {
            await claimItem(claimConfirm.id, claimName.trim(), claimPhone.trim());
            // Remove claimed item from list (it's now archived)
            setItems(items.filter(item => item.id !== claimConfirm.id));
            setStats(prev => ({
                ...prev,
                totalItems: prev.totalItems - 1,
                lostItems: claimConfirm?.type === 'lost' ? prev.lostItems - 1 : prev.lostItems,
                foundItems: claimConfirm?.type === 'found' ? prev.foundItems - 1 : prev.foundItems
            }));
            setClaimConfirm(null);
            setClaimName('');
            setClaimPhone('');
            setOpenMenuId(null);
        } catch (err) {
            console.error('Failed to claim item:', err);
            setError('Failed to claim item. Please try again.');
        } finally {
            setIsClaiming(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Analytics Dashboard */}
            <StatsDashboard />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Items</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.totalItems}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Lost Items</p>
                            <p className="text-3xl font-bold text-red-400 mt-1">{stats.lostItems}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Found Items</p>
                            <p className="text-3xl font-bold text-green-400 mt-1">{stats.foundItems}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                    {['all', 'lost', 'found'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${filter === f
                                ? 'glass-button text-white'
                                : 'glass text-gray-400 hover:text-white'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 items-center">
                    <div className="relative">
                        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter items..."
                            className="py-2 pl-10 pr-4 glass-input rounded-xl text-sm text-white placeholder-gray-500 w-48"
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="p-2 glass rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-red-400 font-semibold">Connection Error</p>
                        <p className="text-gray-300 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="glass-card p-6 max-w-md w-full slide-in">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete Item?</h3>
                                <p className="text-gray-400 mt-1">
                                    Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 glass rounded-xl text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Item Modal */}
            {claimConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                    <div className="glass-card p-6 max-w-md w-full slide-in">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <Gift className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Claim Item</h3>
                                <p className="text-gray-400 mt-1">
                                    You are claiming "{claimConfirm.name}". Please enter your details to confirm.
                                </p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Your Name *</label>
                            <input
                                type="text"
                                value={claimName}
                                onChange={(e) => setClaimName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 glass-input rounded-xl text-white placeholder-gray-500"
                                autoFocus
                            />
                        </div>
                        <div className="mb-4">
                            <label className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                <Phone className="w-4 h-4" />
                                Your Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={claimPhone}
                                onChange={(e) => setClaimPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                className="w-full px-4 py-3 glass-input rounded-xl text-white placeholder-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                📞 The founder will receive your contact info to reach you
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setClaimConfirm(null); setClaimName(''); setClaimPhone(''); }}
                                className="px-4 py-2 glass rounded-xl text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming || !claimName.trim() || !claimPhone.trim()}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isClaiming ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Claiming...
                                    </>
                                ) : (
                                    <>
                                        <Gift className="w-4 h-4" />
                                        Claim Item
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items Grid */}
            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                    {filteredItems.map((item, index) => (
                        <div
                            key={item.id || index}
                            className={`glass-card p-5 hover:scale-[1.02] transition-all group ${item.type === 'lost' ? 'border-red-500/20' : 'border-green-500/20'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'lost' ? 'bg-red-500/20' : 'bg-green-500/20'
                                        }`}>
                                        <Package className={`w-5 h-5 ${item.type === 'lost' ? 'text-red-400' : 'text-green-400'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white capitalize">{item.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'lost'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </div>
                                </div>

                                {/* 3-dot Menu */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                                        }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openMenuId === item.id && (
                                        <div
                                            className="absolute right-0 top-10 z-20 glass-card p-1 min-w-[120px] slide-in"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    setClaimConfirm(item);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors text-sm"
                                            >
                                                <Gift className="w-4 h-4" />
                                                Claim Item
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeleteConfirm(item);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 text-sm">
                                {item.color && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div
                                            className="w-4 h-4 rounded-full border border-white/20"
                                            style={{ backgroundColor: item.color === 'other' ? '#666' : item.color }}
                                        />
                                        <span className="capitalize">{item.color}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    <span className="capitalize">{item.location}</span>
                                </div>

                                {item.owner && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <User className="w-4 h-4" />
                                        <span>{item.owner}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDate(item.timestamp)}</span>
                                </div>
                            </div>

                            {/* Description */}
                            {item.description && (
                                <p className="mt-3 text-sm text-gray-500 border-t border-white/10 pt-3">
                                    {item.description}
                                </p>
                            )}

                            {/* Item ID */}
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <code className="text-xs text-gray-500 font-mono">
                                    {item.id}
                                </code>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredItems.length === 0 && (
                <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">No items found</p>
                    <p className="text-gray-500 text-sm mt-1">
                        {items.length === 0
                            ? 'Report your first item to get started'
                            : 'Try adjusting your search or filters'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
