import { useState } from 'react';
import {
    Search as SearchIcon, Plus, Eye, Package,
    Sparkles, ChevronDown, Github, Heart, Map
} from 'lucide-react';
import Search from './components/Search';
import ReportForm from './components/ReportForm';
import Dashboard from './components/Dashboard';
import StaticCampusMap from './components/StaticCampusMap';

function App() {
    const [activeTab, setActiveTab] = useState('home');
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportType, setReportType] = useState('lost');

    const handleReportLost = () => {
        setReportType('lost');
        setShowReportForm(true);
    };

    const handleReportFound = () => {
        setReportType('found');
        setShowReportForm(true);
    };

    const handleReportSuccess = (response) => {
        // Could trigger a refresh or notification here
        console.log('Report success:', response);
    };

    return (
        <div className="min-h-screen relative">
            {/* Background Orbs */}
            <div className="bg-orb orb-1"></div>
            <div className="bg-orb orb-2"></div>
            <div className="bg-orb orb-3"></div>

            {/* Navigation */}
            <nav className="sticky top-0 z-40 glass border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Lost & Found</h1>
                                <p className="text-xs text-gray-400">Intelligence System</p>
                            </div>
                        </div>

                        {/* Nav Links */}
                        <div className="hidden md:flex items-center gap-1">
                            <button
                                onClick={() => setActiveTab('home')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'home'
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <SearchIcon className="w-4 h-4 inline mr-2" />
                                Search
                            </button>
                            <button
                                onClick={() => setActiveTab('map')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'map'
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Map className="w-4 h-4 inline mr-2" />
                                Campus Map
                            </button>
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'dashboard'
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Eye className="w-4 h-4 inline mr-2" />
                                Dashboard
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReportLost}
                                className="px-4 py-2 glass text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-medium transition-all hidden sm:flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Report Lost
                            </button>
                            <button
                                onClick={handleReportFound}
                                className="px-4 py-2 glass-button rounded-xl font-medium text-white flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Found Item
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10">
                <div className="flex items-center justify-around py-3">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${activeTab === 'home' ? 'text-purple-400' : 'text-gray-400'
                            }`}
                    >
                        <SearchIcon className="w-5 h-5" />
                        <span className="text-xs">Search</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${activeTab === 'map' ? 'text-purple-400' : 'text-gray-400'
                            }`}
                    >
                        <Map className="w-5 h-5" />
                        <span className="text-xs">Map</span>
                    </button>
                    <button
                        onClick={handleReportLost}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-red-400"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="text-xs">Lost</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${activeTab === 'dashboard' ? 'text-purple-400' : 'text-gray-400'
                            }`}
                    >
                        <Eye className="w-5 h-5" />
                        <span className="text-xs">Dashboard</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
                {activeTab === 'home' && (
                    <div className="space-y-16">
                        {/* Hero Section */}
                        <section className="text-center pt-12 pb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-gray-300 mb-6">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                Powered by Custom DSA Algorithms
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                <span className="text-white">Find Your </span>
                                <span className="gradient-text">Lost Items</span>
                            </h1>

                            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
                                Our intelligent system uses Trie-based search, Graph algorithms for location matching,
                                and Heap-based ranking to reunite you with your belongings.
                            </p>

                            {/* Search Bar */}
                            <Search
                                onSelect={(item) => console.log('Selected:', item)}
                                onSearch={(query) => console.log('Search:', query)}
                            />

                            {/* Quick Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                                <button
                                    onClick={handleReportLost}
                                    className="px-6 py-3 glass text-white hover:bg-red-500/20 rounded-xl font-medium transition-all flex items-center gap-2 border border-red-500/30"
                                >
                                    <Plus className="w-5 h-5 text-red-400" />
                                    Report Lost Item
                                </button>
                                <button
                                    onClick={handleReportFound}
                                    className="px-6 py-3 glass-button rounded-xl font-medium text-white flex items-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    I Found Something
                                </button>
                            </div>
                        </section>

                        {/* Features */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-6 text-center hover:scale-[1.02] transition-transform">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                    <SearchIcon className="w-7 h-7 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Trie Search</h3>
                                <p className="text-gray-400 text-sm">
                                    Lightning-fast autocomplete powered by Trie data structure for instant suggestions
                                </p>
                            </div>

                            <div className="glass-card p-6 text-center hover:scale-[1.02] transition-transform">
                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="5" cy="12" r="3" />
                                        <circle cx="19" cy="5" r="3" />
                                        <circle cx="19" cy="19" r="3" />
                                        <line x1="8" y1="12" x2="16" y2="6" />
                                        <line x1="8" y1="12" x2="16" y2="18" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Graph Matching</h3>
                                <p className="text-gray-400 text-sm">
                                    Dijkstra's algorithm calculates proximity between lost and found locations
                                </p>
                            </div>

                            <div className="glass-card p-6 text-center hover:scale-[1.02] transition-transform">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                                        <line x1="12" y1="22" x2="12" y2="15.5" />
                                        <polyline points="22,8.5 12,15.5 2,8.5" />
                                        <polyline points="2,15.5 12,8.5 22,15.5" />
                                        <line x1="12" y1="2" x2="12" y2="8.5" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Heap Ranking</h3>
                                <p className="text-gray-400 text-sm">
                                    Max-Heap prioritizes best matches based on name, color, and location scores
                                </p>
                            </div>
                        </section>

                        {/* Scroll indicator */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="text-sm">View Dashboard</span>
                                <ChevronDown className="w-5 h-5 animate-bounce" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'map' && <StaticCampusMap />}
                {activeTab === 'dashboard' && <Dashboard />}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-6 mt-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        DSA Capstone Project • Built with Custom Data Structures
                    </p>
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                        Made with <Heart className="w-4 h-4 text-red-400" /> using C++ & React
                    </p>
                </div>
            </footer>

            {/* Report Form Modal */}
            <ReportForm
                isOpen={showReportForm}
                onClose={() => setShowReportForm(false)}
                type={reportType}
                onSuccess={handleReportSuccess}
            />
        </div>
    );
}

export default App;
