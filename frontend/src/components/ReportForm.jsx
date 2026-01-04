import { useState, useEffect } from 'react';
import { X, MapPin, Palette, User, Package, FileText, Loader2, CheckCircle, AlertCircle, Tag, Mail, Phone } from 'lucide-react';
import { reportLostItem, reportFoundItem } from '../api';

// All campus locations from blueprint (matching backend graph)
const CAMPUS_LOCATIONS = [
    { value: 'fmc-hostel', label: '🏨 F.M.C Hostel' },
    { value: 'basketball', label: '🏀 Basket Ball Ground' },
    { value: 'prayer-area', label: '🕌 Prayer Area' },
    { value: 'mini-office', label: '🏢 Mini Office Block' },
    { value: 'ausom', label: '🎓 Ausom' },
    { value: 'fmc-building', label: '🏛️ FMC Building' },
    { value: 'fmc-lawn', label: '🌳 FMC Lawn' },
    { value: 'green-area-north', label: '🌿 Green Area (North)' },
    { value: 'pre-fab', label: '🏗️ Pre-Fabricated Block' },
    { value: 'b-block', label: '🅱️ B-Block' },
    { value: 'a-block', label: '🅰️ A-Block' },
    { value: 'admin', label: '🏛️ Admin Block' },
    { value: 'green-area', label: '🌳 Green Area' },
    { value: 'iaa', label: '📊 I.A.A' },
    { value: 'cafeteria', label: '🍽️ Cafeteria' },
    { value: 'auditorium', label: '📚 Auditorium Library' },
    { value: 'c-block', label: '🅲 C-Block' },
    { value: 'sports', label: '🏋️ Sports Complex' },
    { value: 'main-office-lawn', label: '🌿 Main Office Lawn' },
    { value: 'ausom-lawn', label: '🌺 AUSOM Lawn' },
    { value: 'iaa-lawn-2', label: '🌴 IAA Lawn-2' },
    { value: 'iaa-lawn-1', label: '🌴 IAA Lawn-1' },
    { value: 'parking', label: '🚗 Students Parking' },
    { value: 'main-gate', label: '🚪 Main Gate' },
];

// Item categories
const CATEGORIES = [
    { value: 'electronics', label: '📱 Electronics', icon: '📱' },
    { value: 'books', label: '📚 Books', icon: '📚' },
    { value: 'clothing', label: '👕 Clothing', icon: '👕' },
    { value: 'accessories', label: '👜 Accessories', icon: '👜' },
    { value: 'documents', label: '📄 Documents', icon: '📄' },
    { value: 'keys', label: '🔑 Keys', icon: '🔑' },
    { value: 'bags', label: '🎒 Bags', icon: '🎒' },
    { value: 'sports', label: '⚽ Sports', icon: '⚽' },
    { value: 'other', label: '📦 Other', icon: '📦' },
];

function ReportForm({ isOpen, onClose, type = 'lost', onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        color: '',
        location: '',
        owner: '',
        email: '',
        finder: '',
        finderPhone: '',
        finderEmail: '',
        description: '',
        category: 'other',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const isLost = type === 'lost';

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let response;
            if (isLost) {
                response = await reportLostItem({
                    name: formData.name,
                    color: formData.color,
                    location: formData.location,
                    owner: formData.owner,
                    email: formData.email,
                    description: formData.description,
                    category: formData.category,
                });
            } else {
                response = await reportFoundItem({
                    name: formData.name,
                    color: formData.color,
                    location: formData.location,
                    finder: formData.finder,
                    finderPhone: formData.finderPhone,
                    finderEmail: formData.finderEmail,
                    description: formData.description,
                    category: formData.category,
                });
            }

            setResult(response);
            if (onSuccess) {
                onSuccess(response);
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.error || 'Failed to submit. Is the C++ server running?');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            color: '',
            location: '',
            owner: '',
            email: '',
            finder: '',
            finderPhone: '',
            finderEmail: '',
            description: '',
            category: 'other',
        });
        setResult(null);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    const colors = [
        'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow',
        'Brown', 'Gray', 'Purple', 'Orange', 'Pink', 'Other'
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
            <div
                className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto slide-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 id="modal-title" className="text-2xl font-bold gradient-text">
                        Report {isLost ? 'Lost' : 'Found'} Item
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Success State */}
                    {result && (
                        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl slide-in">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                                <span className="text-green-400 font-semibold">
                                    {isLost ? 'Item Reported Successfully!' : 'Item Reported - Matches Found!'}
                                </span>
                            </div>

                            {result.id && (
                                <p className="text-gray-300 text-sm mb-2">
                                    Item ID: <code className="text-purple-400">{result.id}</code>
                                </p>
                            )}

                            {/* Show matches for found items */}
                            {!isLost && result.matches && result.matches.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-white font-semibold mb-3">Potential Matches:</h3>
                                    <p className="text-sm text-cyan-300 mb-3">
                                        🔔 Webhook notifications will be sent via n8n automation
                                    </p>
                                    <div className="space-y-2 stagger-children">
                                        {result.matches.slice(0, 5).map((match, index) => (
                                            <div
                                                key={index}
                                                className="p-3 bg-white/5 rounded-lg border border-white/10"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-medium text-white">{match.itemName}</span>
                                                        <span className="text-gray-400 ml-2">by {match.owner}</span>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-sm font-bold text-white ${match.score >= 20 ? 'score-high' :
                                                        match.score >= 10 ? 'score-medium' : 'score-low'
                                                        }`}>
                                                        {match.score} pts
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                                    <span>📍 {match.location}</span>
                                                    <span>🎨 {match.color}</span>
                                                </div>
                                                <div className="flex gap-2 mt-2 text-xs">
                                                    <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300">
                                                        Name: +{match.nameScore}
                                                    </span>
                                                    <span className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-300">
                                                        Color: +{match.colorScore}
                                                    </span>
                                                    <span className="px-2 py-1 bg-green-500/20 rounded text-green-300">
                                                        Proximity: +{match.proximityScore}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isLost && result.matches && result.matches.length === 0 && (
                                <p className="text-gray-400 text-sm">No matching lost items found yet.</p>
                            )}

                            <button
                                onClick={resetForm}
                                className="mt-4 w-full py-2 glass-button rounded-lg font-medium text-white"
                            >
                                Report Another Item
                            </button>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="text-red-400 font-semibold">Error</span>
                                <p className="text-gray-300 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    {!result && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Item Name */}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <Package className="w-4 h-4" />
                                    Item Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Wallet, Phone, Keys"
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500"
                                    required
                                />
                            </div>

                            {/* Category - NEW */}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <Tag className="w-4 h-4" />
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white bg-transparent"
                                    required
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value} className="bg-gray-900">
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <Palette className="w-4 h-4" />
                                    Color
                                </label>
                                <select
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white bg-transparent"
                                >
                                    <option value="" className="bg-gray-900">Select Color</option>
                                    {colors.map((color) => (
                                        <option key={color} value={color.toLowerCase()} className="bg-gray-900">
                                            {color}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <MapPin className="w-4 h-4" />
                                    Location *
                                </label>
                                <select
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white bg-transparent"
                                    required
                                >
                                    <option value="" className="bg-gray-900">Select Location</option>
                                    {CAMPUS_LOCATIONS.map((loc) => (
                                        <option key={loc.value} value={loc.value} className="bg-gray-900">
                                            {loc.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Owner/Finder */}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <User className="w-4 h-4" />
                                    {isLost ? 'Your Name *' : 'Finder Name'}
                                </label>
                                <input
                                    type="text"
                                    name={isLost ? 'owner' : 'finder'}
                                    value={isLost ? formData.owner : formData.finder}
                                    onChange={handleChange}
                                    placeholder={isLost ? 'Enter your name' : 'Enter finder name'}
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500"
                                    required={isLost}
                                />
                            </div>

                            {/* Email (only for lost items) */}
                            {isLost && (
                                <div>
                                    <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                        <Mail className="w-4 h-4" />
                                        Your Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email for notifications"
                                        className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        📧 We'll notify you via n8n when someone finds your item
                                    </p>
                                </div>
                            )}

                            {/* Finder Phone (only for found items) */}
                            {!isLost && (
                                <div>
                                    <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                        <Phone className="w-4 h-4" />
                                        Your Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        name="finderPhone"
                                        value={formData.finderPhone}
                                        onChange={handleChange}
                                        placeholder="Enter your phone number so owner can contact you"
                                        className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        📞 The owner will receive your contact info to reach you
                                    </p>
                                </div>
                            )}

                            {/* Finder Email (only for found items) */}
                            {!isLost && (
                                <div>
                                    <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                        <Mail className="w-4 h-4" />
                                        Your Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="finderEmail"
                                        value={formData.finderEmail}
                                        onChange={handleChange}
                                        placeholder="Enter your email for notifications"
                                        className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        📧 The claimer will receive your email to contact you
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-2">
                                    <FileText className="w-4 h-4" />
                                    Description *
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the item in detail (required for AI matching)..."
                                    rows={3}
                                    required
                                    className="w-full py-3 px-4 glass-input rounded-xl text-white placeholder-gray-500 resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 glass-button rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReportForm;
