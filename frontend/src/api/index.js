import axios from 'axios';

// API base URL - connects to C++ backend
const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Report a lost item (with category support)
export const reportLostItem = async (itemData) => {
    const response = await api.post('/lost', itemData);
    return response.data;
};

// Report a found item and get matches
export const reportFoundItem = async (itemData) => {
    const response = await api.post('/found', itemData);
    return response.data;
};

// Delete an item
export const deleteItem = async (itemId) => {
    const response = await api.delete(`/item/${itemId}`);
    return response.data;
};

// Archive an item
export const archiveItem = async (itemId) => {
    const response = await api.post(`/item/${itemId}/archive`);
    return response.data;
};

// Autocomplete search (with optional category filter)
export const searchAutocomplete = async (query, category = '') => {
    const params = { q: query };
    if (category) params.category = category;
    const response = await api.get('/search', { params });
    return response.data;
};

// Advanced search with multiple filters
export const advancedSearch = async (filters) => {
    const response = await api.get('/search/advanced', { params: filters });
    return response.data;
};

// Get sorted history
export const getHistory = async () => {
    const response = await api.get('/history');
    return response.data;
};

// Get active items
export const getActiveItems = async () => {
    const response = await api.get('/items/active');
    return response.data;
};

// Get archived items
export const getArchivedItems = async () => {
    const response = await api.get('/items/archived');
    return response.data;
};

// Get all items (defaults to active)
export const getAllItems = async () => {
    const response = await api.get('/items');
    return response.data;
};

// Get lost items
export const getLostItems = async () => {
    const response = await api.get('/lost');
    return response.data;
};

// Get found items
export const getFoundItems = async () => {
    const response = await api.get('/found');
    return response.data;
};

// Get available locations
export const getLocations = async () => {
    const response = await api.get('/locations');
    return response.data;
};

// Get all categories
export const getCategories = async () => {
    const response = await api.get('/categories');
    return response.data;
};

// Get items by category
export const getItemsByCategory = async (category) => {
    const response = await api.get(`/category/${category}`);
    return response.data;
};

// Get statistics
export const getStats = async () => {
    const response = await api.get('/stats');
    return response.data;
};

// Configure webhook URL (for n8n integration)
export const configureWebhook = async (url) => {
    const response = await api.post('/webhook/config', { url });
    return response.data;
};

// Get webhook configuration
export const getWebhookConfig = async () => {
    const response = await api.get('/webhook/config');
    return response.data;
};

// Trigger expiration check
export const archiveExpiredItems = async () => {
    const response = await api.post('/archive/expired');
    return response.data;
};

// Claim an item
export const claimItem = async (itemId, claimedBy, claimerPhone) => {
    const response = await api.post(`/item/${itemId}/claim`, { claimedBy, claimerPhone });
    return response.data;
};

// Get detailed analytics
export const getAnalytics = async () => {
    const response = await api.get('/analytics');
    return response.data;
};

export default api;
