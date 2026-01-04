//
// System.h - Lost & Found System Core Logic
//

#ifndef SYSTEM_H
#define SYSTEM_H

#include "DataStructures.h"
#include <string>
#include <vector>
#include <ctime>
#include <sstream>
#include <fstream>
#include <iomanip>
#include <iomanip>
#include <random>
#include <map>

// Analytics Data Structure
struct AnalyticsData {
    size_t totalItems;
    size_t claimedItems;
    double successRate;
    double avgClaimTimeHours;
    std::map<std::string, int> categoryStats;
    std::map<std::string, int> locationStats;
};

class LostFoundSystem {
private:
    Trie searchTrie;
    ItemHashMap itemMap;
    LocationGraph campusGraph;
    ItemBST historyBST;
    InvertedIndex invertedIndex;        // NEW: For multi-field search
    LocationCluster locationCluster;     // NEW: For proximity grouping
    CategoryTrieManager categoryTries;   // NEW: For category-specific search
    int itemCounter;
    std::string webhookUrl;              // For n8n integration (match notifications)
    std::string claimWebhookUrl;         // For n8n integration (claim notifications)
    
    std::string generateId() {
        std::stringstream ss;
        ss << "ITEM-" << std::setfill('0') << std::setw(6) << (++itemCounter);
        return ss.str();
    }
    
    long long getCurrentTimestamp() {
        return static_cast<long long>(std::time(nullptr));
    }
    
    std::string toLower(const std::string& str) {
        std::string result = str;
        std::transform(result.begin(), result.end(), result.begin(), ::tolower);
        return result;
    }
    
    int calculateNameScore(const std::string& name1, const std::string& name2) {
        std::string lower1 = toLower(name1);
        std::string lower2 = toLower(name2);
        
        if (lower1 == lower2) return 10;
        if (lower1.find(lower2) != std::string::npos || 
            lower2.find(lower1) != std::string::npos) return 7;
        return 0;
    }
    
    int calculateColorScore(const std::string& color1, const std::string& color2) {
        if (toLower(color1) == toLower(color2)) return 5;
        return 0;
    }
    
    int calculateProximityScore(const std::string& loc1, const std::string& loc2) {
        int distance = campusGraph.getDistance(toLower(loc1), toLower(loc2));
        if (distance == std::numeric_limits<int>::max()) return 0;
        if (distance == 0) return 15;
        int score = 15 - (distance / 10);
        return std::max(0, score);
    }
    
    // Calculate category match score
    int calculateCategoryScore(Category cat1, Category cat2) {
        return (cat1 == cat2) ? 8 : 0;
    }
    
public:
    LostFoundSystem() : itemCounter(0) {
        campusGraph.initializeDefaultCampus();
        locationCluster.setGraph(&campusGraph);
        locationCluster.buildClusters();
    }
    
    // Configure webhook URLs for n8n integration
    void setWebhookUrl(const std::string& url) { webhookUrl = url; }
    std::string getWebhookUrl() const { return webhookUrl; }
    void setClaimWebhookUrl(const std::string& url) { claimWebhookUrl = url; }
    std::string getClaimWebhookUrl() const { return claimWebhookUrl; }
    
    // Report a lost item with category and email
    std::string reportLostItem(const std::string& name, const std::string& color,
                               const std::string& location, const std::string& owner,
                               const std::string& description = "",
                               const std::string& categoryStr = "other",
                               const std::string& email = "") {
        std::string id = generateId();
        long long timestamp = getCurrentTimestamp();
        Category category = stringToCategory(categoryStr);
        
        Item item(id, name, color, location, owner, "lost", timestamp, description, category, email);
        
        // Insert into all data structures
        itemMap.insert(id, item);
        searchTrie.insert(name);
        historyBST.insert(item);
        invertedIndex.indexItem(item);
        categoryTries.insert(name, category);
        
        return id;
    }
    
    // Report a found item and get matches
    std::vector<MatchCandidate> reportFoundItem(const std::string& name, const std::string& color,
                                                 const std::string& location, const std::string& finder,
                                                 const std::string& description = "",
                                                 const std::string& categoryStr = "other",
                                                 const std::string& email = "") {
        std::string id = generateId();
        long long timestamp = getCurrentTimestamp();
        Category category = stringToCategory(categoryStr);
        
        Item foundItem(id, name, color, location, finder, "found", timestamp, description, category, email);
        itemMap.insert(id, foundItem);
        searchTrie.insert(name);
        historyBST.insert(foundItem);
        invertedIndex.indexItem(foundItem);
        categoryTries.insert(name, category);
        
        // Find matches using DSA - only from non-archived lost items
        MatchHeap matchHeap;
        std::vector<Item> lostItems = itemMap.getItemsByType("lost");
        
        for (const auto& lostItem : lostItems) {
            // Skip archived items
            if (lostItem.archived) continue;
            
            MatchCandidate candidate;
            candidate.itemId = lostItem.id;
            candidate.itemName = lostItem.name;
            candidate.owner = lostItem.owner;
            candidate.location = lostItem.location;
            candidate.color = lostItem.color;
            
            // Calculate scores (now includes category)
            candidate.nameScore = calculateNameScore(name, lostItem.name);
            candidate.colorScore = calculateColorScore(color, lostItem.color);
            candidate.proximityScore = calculateProximityScore(location, lostItem.location);
            int categoryScore = calculateCategoryScore(category, lostItem.category);
            candidate.score = candidate.nameScore + candidate.colorScore + 
                             candidate.proximityScore + categoryScore;
            
            // Only consider as match if product name matches (nameScore > 0)
            // This ensures we don't match unrelated items based on color/location alone
            if (candidate.nameScore > 0 && candidate.score > 0) {
                matchHeap.insert(candidate);
            }
        }
        
        return matchHeap.getTopK(10);
    }
    
    // Autocomplete search (global)
    std::vector<std::string> searchAutocomplete(const std::string& prefix) {
        return searchTrie.autocomplete(prefix, 10);
    }
    
    // Autocomplete search by category
    std::vector<std::string> searchAutocompleteByCategory(const std::string& prefix, 
                                                           const std::string& categoryStr) {
        Category cat = stringToCategory(categoryStr);
        return categoryTries.autocompleteByCategory(prefix, cat, 10);
    }
    
    // Advanced search with multiple filters
    std::vector<Item> advancedSearch(const std::string& name = "",
                                      const std::string& color = "",
                                      const std::string& location = "",
                                      const std::string& category = "",
                                      const std::string& type = "",
                                      long long dateFrom = 0,
                                      long long dateTo = 0,
                                      bool includeArchived = false) {
        std::vector<Item> results;
        
        // Use inverted index for initial filtering
        std::set<std::string> matchingIds = invertedIndex.search(name, color, location, category);
        
        // If no filters provided to inverted index, get all items
        if (name.empty() && color.empty() && location.empty() && category.empty()) {
            auto allItems = itemMap.getAllItems();
            for (const auto& item : allItems) {
                matchingIds.insert(item.id);
            }
        }
        
        // Apply additional filters
        for (const auto& id : matchingIds) {
            Item* item = itemMap.get(id);
            if (!item) continue;
            
            // Filter by archived status
            if (!includeArchived && item->archived) continue;
            
            // Filter by type
            if (!type.empty() && item->type != type) continue;
            
            // Filter by date range
            if (dateFrom > 0 && item->timestamp < dateFrom) continue;
            if (dateTo > 0 && item->timestamp > dateTo) continue;
            
            results.push_back(*item);
        }
        
        return results;
    }
    
    // Archive expired items
    int archiveExpiredItems() {
        int archivedCount = 0;
        auto allItems = itemMap.getAllItems();
        
        for (auto& item : allItems) {
            if (!item.archived && item.isExpired()) {
                Item* storedItem = itemMap.get(item.id);
                if (storedItem) {
                    storedItem->archived = true;
                    archivedCount++;
                }
            }
        }
        
        return archivedCount;
    }
    
    // Get only active (non-archived) items
    std::vector<Item> getActiveItems() {
        std::vector<Item> result;
        for (auto& item : itemMap.getAllItems()) {
            if (!item.archived) {
                result.push_back(item);
            }
        }
        return result;
    }
    
    // Get archived items
    std::vector<Item> getArchivedItems() {
        std::vector<Item> result;
        for (auto& item : itemMap.getAllItems()) {
            if (item.archived) {
                result.push_back(item);
            }
        }
        return result;
    }
    
    // Get items by category
    std::vector<Item> getItemsByCategory(const std::string& categoryStr) {
        std::vector<Item> result;
        Category cat = stringToCategory(categoryStr);
        for (auto& item : itemMap.getAllItems()) {
            if (item.category == cat && !item.archived) {
                result.push_back(item);
            }
        }
        return result;
    }
    
    // Get all available categories
    std::vector<std::string> getCategories() {
        return getAllCategories();
    }
    
    // Get cluster members for a location
    std::vector<std::string> getNearbyLocations(const std::string& location) {
        return locationCluster.getClusterMembers(location);
    }
    
    // Get sorted history
    std::vector<Item> getHistory(bool ascending = false) {
        return historyBST.getSortedHistory(ascending);
    }
    
    // Get all items
    std::vector<Item> getAllItems() {
        return itemMap.getAllItems();
    }
    
    // Get item by ID
    Item* getItemById(const std::string& id) {
        return itemMap.get(id);
    }
    
    // Get available locations
    std::vector<std::string> getLocations() {
        return campusGraph.getLocations();
    }
    
    // Get items by type
    std::vector<Item> getItemsByType(const std::string& type) {
        return itemMap.getItemsByType(type);
    }
    
    // Delete an item by ID
    bool deleteItem(const std::string& id) {
        Item* item = itemMap.get(id);
        if (item == nullptr) {
            return false;
        }
        // Remove from inverted index
        invertedIndex.removeItem(*item);
        // Remove from hashmap
        return itemMap.remove(id);
    }
    
    // Claim an item
    bool claimItem(const std::string& id, const std::string& claimedBy) {
        Item* item = itemMap.get(id);
        if (item == nullptr) return false;
        
        item->claimed = true;
        item->claimedBy = claimedBy;
        item->claimedAt = getCurrentTimestamp();
        item->archived = true; // Claimed items are automatically archived
        
        return true;
    }
    
    // Get advanced analytics
    AnalyticsData getAnalytics() {
        AnalyticsData data;
        data.totalItems = 0;
        data.claimedItems = 0;
        data.successRate = 0.0;
        data.avgClaimTimeHours = 0.0;
        
        std::vector<Item> allItems = itemMap.getAllItems();
        data.totalItems = allItems.size();
        
        long long totalClaimTime = 0;
        
        for (const auto& item : allItems) {
            // Category stats
            std::string catStr = categoryToString(item.category);
            data.categoryStats[catStr]++;
            
            // Location stats
            data.locationStats[item.location]++;
            
            // Claim stats
            if (item.claimed) {
                data.claimedItems++;
                long long claimTime = item.claimedAt - item.timestamp;
                if (claimTime > 0) {
                    totalClaimTime += claimTime;
                }
            }
        }
        
        if (data.totalItems > 0) {
            data.successRate = (static_cast<double>(data.claimedItems) / data.totalItems) * 100.0;
        }
        
        if (data.claimedItems > 0) {
            data.avgClaimTimeHours = (static_cast<double>(totalClaimTime) / data.claimedItems) / 3600.0;
        }
        
        return data;
    }

    // Manually archive an item (e.g., when claimed)
    bool archiveItem(const std::string& id) {
        Item* item = itemMap.get(id);
        if (item == nullptr) {
            return false;
        }
        item->archived = true;
        return true;
    }
    
    // Save data to JSON file
    bool saveToFile(const std::string& filename);
    
    // Load data from JSON file
    bool loadFromFile(const std::string& filename);
    
    // Get statistics
    size_t getTotalItems() { return itemMap.size(); }
    size_t getActiveItemCount() { return getActiveItems().size(); }
    size_t getArchivedItemCount() { return getArchivedItems().size(); }
    int getItemCounter() { return itemCounter; }
    void setItemCounter(int count) { itemCounter = count; }
};

#endif // SYSTEM_H
