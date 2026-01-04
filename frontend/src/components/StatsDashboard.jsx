import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2, TrendingUp, Clock, CheckCircle, MapPin, Tag } from 'lucide-react';
import { getAnalytics } from '../api';

function StatsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const stats = await getAnalytics();
            setData(stats);
        } catch (err) {
            console.error(err);
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
    );

    if (error) return (
        <div className="text-red-400 text-center p-8 bg-red-500/10 rounded-xl border border-red-500/20">
            {error}
        </div>
    );

    if (!data) return null;

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold gradient-text mb-6">System Analytics</h2>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-purple-500/20 w-24 h-24 rounded-full group-hover:bg-purple-500/30 transition-all"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Tag className="w-4 h-4" />
                            <span>Total Items</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{data.totalItems}</div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-green-500/20 w-24 h-24 rounded-full group-hover:bg-green-500/30 transition-all"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Success Rate</span>
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                            {data.successRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{data.claimedItems} items returned</div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-blue-500/20 w-24 h-24 rounded-full group-hover:bg-blue-500/30 transition-all"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Clock className="w-4 h-4" />
                            <span>Avg. Claim Time</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-400">
                            {data.averageClaimTimeHours.toFixed(1)}h
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-orange-500/20 w-24 h-24 rounded-full group-hover:bg-orange-500/30 transition-all"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>Active Items</span>
                        </div>
                        <div className="text-3xl font-bold text-orange-400">
                            {data.totalItems - data.claimedItems}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Locations Chart */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-purple-400" />
                        High-Loss Locations
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topLocations.slice(0, 8)} layout="vertical">
                                <XAxis type="number" stroke="#6b7280" />
                                <YAxis dataKey="location" type="category" width={100} stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                    {data.topLocations.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Chart */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-emerald-400" />
                        Item Categories
                    </h3>
                    <div className="h-[300px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.topCategories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="category"
                                >
                                    {data.topCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatsDashboard;
