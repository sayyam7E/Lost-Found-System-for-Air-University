//
// DataStructures.h - Custom DSA implementations for Lost & Found System
// Contains: Trie, HashMap, Graph (with Dijkstra), MaxHeap, BST
//

#ifndef DATA_STRUCTURES_H
#define DATA_STRUCTURES_H

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <set>
#include <queue>
#include <algorithm>
#include <limits>
#include <functional>
#include <ctime>
#include <sstream>
#include <map>

// ============================================================================
// CATEGORY ENUM - Item categories for filtering
// ============================================================================
enum class Category {
    ELECTRONICS = 0,
    BOOKS = 1,
    CLOTHING = 2,
    ACCESSORIES = 3,
    DOCUMENTS = 4,
    KEYS = 5,
    BAGS = 6,
    SPORTS = 7,
    OTHER = 8
};

// Category utilities
inline std::string categoryToString(Category cat) {
    switch(cat) {
        case Category::ELECTRONICS: return "electronics";
        case Category::BOOKS: return "books";
        case Category::CLOTHING: return "clothing";
        case Category::ACCESSORIES: return "accessories";
        case Category::DOCUMENTS: return "documents";
        case Category::KEYS: return "keys";
        case Category::BAGS: return "bags";
        case Category::SPORTS: return "sports";
        default: return "other";
    }
}

inline Category stringToCategory(const std::string& str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    if (lower == "electronics") return Category::ELECTRONICS;
    if (lower == "books") return Category::BOOKS;
    if (lower == "clothing") return Category::CLOTHING;
    if (lower == "accessories") return Category::ACCESSORIES;
    if (lower == "documents") return Category::DOCUMENTS;
    if (lower == "keys") return Category::KEYS;
    if (lower == "bags") return Category::BAGS;
    if (lower == "sports") return Category::SPORTS;
    return Category::OTHER;
}

inline std::vector<std::string> getAllCategories() {
    return {"electronics", "books", "clothing", "accessories", 
            "documents", "keys", "bags", "sports", "other"};
}

// ============================================================================
// TRIE - For autocomplete search functionality
// ============================================================================
class TrieNode {
public:
    std::unordered_map<char, TrieNode*> children;
    bool isEndOfWord;
    std::string fullWord;
    
    TrieNode() : isEndOfWord(false) {}
    
    ~TrieNode() {
        for (auto& pair : children) {
            delete pair.second;
        }
    }
};

class Trie {
private:
    TrieNode* root;
    
    void collectWords(TrieNode* node, std::vector<std::string>& results, int limit) {
        if (results.size() >= limit) return;
        
        if (node->isEndOfWord) {
            results.push_back(node->fullWord);
        }
        
        for (auto& pair : node->children) {
            collectWords(pair.second, results, limit);
        }
    }
    
public:
    Trie() {
        root = new TrieNode();
    }
    
    ~Trie() {
        delete root;
    }
    
    void insert(const std::string& word) {
        TrieNode* current = root;
        std::string lowerWord = word;
        std::transform(lowerWord.begin(), lowerWord.end(), lowerWord.begin(), ::tolower);
        
        for (char c : lowerWord) {
            if (current->children.find(c) == current->children.end()) {
                current->children[c] = new TrieNode();
            }
            current = current->children[c];
        }
        current->isEndOfWord = true;
        current->fullWord = word;
    }
    
    bool search(const std::string& word) {
        TrieNode* current = root;
        std::string lowerWord = word;
        std::transform(lowerWord.begin(), lowerWord.end(), lowerWord.begin(), ::tolower);
        
        for (char c : lowerWord) {
            if (current->children.find(c) == current->children.end()) {
                return false;
            }
            current = current->children[c];
        }
        return current->isEndOfWord;
    }
    
    std::vector<std::string> autocomplete(const std::string& prefix, int limit = 10) {
        std::vector<std::string> results;
        TrieNode* current = root;
        std::string lowerPrefix = prefix;
        std::transform(lowerPrefix.begin(), lowerPrefix.end(), lowerPrefix.begin(), ::tolower);
        
        // Navigate to the end of prefix
        for (char c : lowerPrefix) {
            if (current->children.find(c) == current->children.end()) {
                return results; // Prefix not found
            }
            current = current->children[c];
        }
        
        // Collect all words from this point
        collectWords(current, results, limit);
        return results;
    }
    
    void clear() {
        delete root;
        root = new TrieNode();
    }
};

// ============================================================================
// ITEM STRUCT - Common data structure for lost/found items
// ============================================================================
const int EXPIRATION_DAYS = 30;  // Items expire after 30 days

struct Item {
    std::string id;
    std::string name;
    std::string color;
    std::string location;
    std::string owner;
    std::string email;          // NEW: Owner's email for notifications
    std::string type; // "lost" or "found"
    long long timestamp;
    std::string description;
    Category category;      // Item category
    bool archived;          // For expired/claimed items
    long long expiresAt;    // Auto-archive timestamp
    
    // Claiming fields
    bool claimed;
    std::string claimedBy;
    long long claimedAt;
    
    Item() : timestamp(0), expiresAt(0), archived(false), category(Category::OTHER), claimed(false), claimedAt(0) {}
    
    Item(std::string id, std::string name, std::string color, std::string loc, 
         std::string owner, std::string type, long long time, 
         std::string desc = "", Category cat = Category::OTHER, std::string email = "") 
        : id(id), name(name), color(color), location(loc), owner(owner), 
          email(email), type(type), timestamp(time), description(desc), 
          category(cat), archived(false), expiresAt(0),
          claimed(false), claimedBy(""), claimedAt(0) {
        // Default expiration: 30 days
        expiresAt = timestamp + (30 * 24 * 60 * 60);
    }
    
    bool isExpired() const {
        return static_cast<long long>(std::time(nullptr)) > expiresAt;
    }
};

// ============================================================================
// HASHMAP - O(1) item lookup by ID
// ============================================================================
class ItemHashMap {
private:
    std::unordered_map<std::string, Item> items;
    
public:
    void insert(const std::string& id, const Item& item) {
        items[id] = item;
    }
    
    Item* get(const std::string& id) {
        auto it = items.find(id);
        if (it != items.end()) {
            return &(it->second);
        }
        return nullptr;
    }
    
    bool remove(const std::string& id) {
        return items.erase(id) > 0;
    }
    
    bool exists(const std::string& id) {
        return items.find(id) != items.end();
    }
    
    std::vector<Item> getAllItems() {
        std::vector<Item> result;
        for (auto& pair : items) {
            result.push_back(pair.second);
        }
        return result;
    }
    
    std::vector<Item> getItemsByType(const std::string& type) {
        std::vector<Item> result;
        for (auto& pair : items) {
            if (pair.second.type == type) {
                result.push_back(pair.second);
            }
        }
        return result;
    }
    
    size_t size() {
        return items.size();
    }
    
    void clear() {
        items.clear();
    }
};

// ============================================================================
// GRAPH - Location proximity with Dijkstra's algorithm
// ============================================================================
class LocationGraph {
private:
    std::unordered_map<std::string, std::vector<std::pair<std::string, int>>> adjacencyList;
    
public:
    void addLocation(const std::string& location) {
        if (adjacencyList.find(location) == adjacencyList.end()) {
            adjacencyList[location] = std::vector<std::pair<std::string, int>>();
        }
    }
    
    void addEdge(const std::string& from, const std::string& to, int distance) {
        addLocation(from);
        addLocation(to);
        adjacencyList[from].push_back({to, distance});
        adjacencyList[to].push_back({from, distance}); // Undirected graph
    }
    
    std::vector<std::string> getLocations() {
        std::vector<std::string> locations;
        for (auto& pair : adjacencyList) {
            locations.push_back(pair.first);
        }
        return locations;
    }
    
    // Dijkstra's algorithm - returns shortest distance between two locations
    int getDistance(const std::string& start, const std::string& end) {
        if (adjacencyList.find(start) == adjacencyList.end() ||
            adjacencyList.find(end) == adjacencyList.end()) {
            return std::numeric_limits<int>::max();
        }
        
        std::unordered_map<std::string, int> distances;
        for (auto& pair : adjacencyList) {
            distances[pair.first] = std::numeric_limits<int>::max();
        }
        distances[start] = 0;
        
        // Min-heap: (distance, node)
        std::priority_queue<std::pair<int, std::string>,
                           std::vector<std::pair<int, std::string>>,
                           std::greater<std::pair<int, std::string>>> pq;
        pq.push({0, start});
        
        while (!pq.empty()) {
            auto [dist, current] = pq.top();
            pq.pop();
            
            if (current == end) {
                return dist;
            }
            
            if (dist > distances[current]) {
                continue;
            }
            
            for (auto& [neighbor, weight] : adjacencyList[current]) {
                int newDist = dist + weight;
                if (newDist < distances[neighbor]) {
                    distances[neighbor] = newDist;
                    pq.push({newDist, neighbor});
                }
            }
        }
        
        return distances[end];
    }
    
    bool isNear(const std::string& loc1, const std::string& loc2, int threshold = 100) {
        int dist = getDistance(loc1, loc2);
        return dist <= threshold;
    }
    
    void clear() {
        adjacencyList.clear();
    }
    
    // Initialize with campus locations from blueprint
    void initializeDefaultCampus() {
        // ============================================
        // CAMPUS GRAPH - Based on Campus Blueprint Map
        // Distances in meters (walking distance estimates)
        // ============================================
        
        // TOP ROW - F.M.C Hostel to FMC Building area
        addEdge("fmc-hostel", "basketball", 40);
        addEdge("basketball", "prayer-area", 50);
        addEdge("prayer-area", "mini-office", 30);
        addEdge("mini-office", "ausom", 60);
        addEdge("ausom", "fmc-building", 50);
        addEdge("fmc-building", "fmc-lawn", 40);
        
        // SECOND ROW - Pre-fab to Green Area
        addEdge("pre-fab", "b-block", 50);
        addEdge("b-block", "mini-office", 60);
        addEdge("b-block", "ausom", 80);
        addEdge("ausom", "green-area", 50);
        addEdge("green-area", "fmc-building", 60);
        addEdge("fmc-lawn", "green-area-north", 70);
        
        // THIRD ROW - A-Block to IAA
        addEdge("pre-fab", "a-block", 40);
        addEdge("a-block", "b-block", 40);
        addEdge("a-block", "admin", 50);
        addEdge("admin", "green-area", 60);
        addEdge("green-area", "iaa", 50);
        addEdge("iaa", "cafeteria", 40);
        addEdge("cafeteria", "auditorium", 50);
        
        // FOURTH ROW - C-Block to Auditorium
        addEdge("c-block", "a-block", 50);
        addEdge("c-block", "sports", 60);
        addEdge("sports", "main-office-lawn", 70);
        addEdge("main-office-lawn", "admin", 40);
        addEdge("main-office-lawn", "ausom-lawn", 50);
        addEdge("ausom-lawn", "iaa-lawn-2", 60);
        addEdge("iaa-lawn-2", "iaa-lawn-1", 40);
        addEdge("iaa-lawn-1", "auditorium", 50);
        
        // BOTTOM - Sports Complex to Parking
        addEdge("sports", "parking", 80);
        addEdge("main-office-lawn", "parking", 60);
        addEdge("ausom-lawn", "parking", 50);
        addEdge("iaa-lawn-2", "parking", 60);
        addEdge("iaa-lawn-1", "parking", 70);
        addEdge("parking", "main-gate", 100);
        
        // Vertical connections
        addEdge("fmc-hostel", "pre-fab", 80);
        addEdge("basketball", "pre-fab", 60);
        addEdge("pre-fab", "c-block", 70);
        addEdge("c-block", "parking", 120);
        addEdge("b-block", "a-block", 40);
        addEdge("a-block", "sports", 100);
        addEdge("admin", "main-office-lawn", 40);
        addEdge("admin", "ausom-lawn", 80);
        addEdge("green-area", "ausom-lawn", 60);
        addEdge("iaa", "iaa-lawn-2", 50);
        addEdge("iaa", "iaa-lawn-1", 60);
        addEdge("cafeteria", "iaa-lawn-1", 70);
        addEdge("auditorium", "main-gate", 80);
        
        // Additional cross-connections for better routing
        addEdge("fmc-building", "iaa", 90);
        addEdge("ausom", "admin", 100);
        addEdge("b-block", "admin", 70);
        addEdge("green-area", "cafeteria", 70);
    }
};

// ============================================================================
// MAX HEAP - For ranking match candidates
// ============================================================================
struct MatchCandidate {
    std::string itemId;
    std::string itemName;
    std::string owner;
    std::string location;
    std::string color;
    int score;
    int nameScore;
    int colorScore;
    int proximityScore;
    
    MatchCandidate() : score(0), nameScore(0), colorScore(0), proximityScore(0) {}
    
    bool operator<(const MatchCandidate& other) const {
        return score < other.score; // For max-heap
    }
};

class MatchHeap {
private:
    std::vector<MatchCandidate> heap;
    
    void heapifyUp(int index) {
        while (index > 0) {
            int parent = (index - 1) / 2;
            if (heap[index].score > heap[parent].score) {
                std::swap(heap[index], heap[parent]);
                index = parent;
            } else {
                break;
            }
        }
    }
    
    void heapifyDown(int index) {
        int size = heap.size();
        while (true) {
            int largest = index;
            int left = 2 * index + 1;
            int right = 2 * index + 2;
            
            if (left < size && heap[left].score > heap[largest].score) {
                largest = left;
            }
            if (right < size && heap[right].score > heap[largest].score) {
                largest = right;
            }
            
            if (largest != index) {
                std::swap(heap[index], heap[largest]);
                index = largest;
            } else {
                break;
            }
        }
    }
    
public:
    void insert(const MatchCandidate& candidate) {
        heap.push_back(candidate);
        heapifyUp(heap.size() - 1);
    }
    
    MatchCandidate extractMax() {
        if (heap.empty()) {
            return MatchCandidate();
        }
        
        MatchCandidate max = heap[0];
        heap[0] = heap.back();
        heap.pop_back();
        
        if (!heap.empty()) {
            heapifyDown(0);
        }
        
        return max;
    }
    
    MatchCandidate peek() {
        if (heap.empty()) {
            return MatchCandidate();
        }
        return heap[0];
    }
    
    bool empty() {
        return heap.empty();
    }
    
    size_t size() {
        return heap.size();
    }
    
    void clear() {
        heap.clear();
    }
    
    std::vector<MatchCandidate> getTopK(int k) {
        std::vector<MatchCandidate> results;
        MatchHeap tempHeap = *this; // Copy
        
        for (int i = 0; i < k && !tempHeap.empty(); i++) {
            results.push_back(tempHeap.extractMax());
        }
        
        return results;
    }
};

// ============================================================================
// BST - For sorted history by timestamp
// ============================================================================
class BSTNode {
public:
    Item item;
    BSTNode* left;
    BSTNode* right;
    
    BSTNode(const Item& item) : item(item), left(nullptr), right(nullptr) {}
};

class ItemBST {
private:
    BSTNode* root;
    
    BSTNode* insert(BSTNode* node, const Item& item) {
        if (node == nullptr) {
            return new BSTNode(item);
        }
        
        if (item.timestamp < node->item.timestamp) {
            node->left = insert(node->left, item);
        } else {
            node->right = insert(node->right, item);
        }
        
        return node;
    }
    
    void inorderTraversal(BSTNode* node, std::vector<Item>& result) {
        if (node == nullptr) return;
        
        inorderTraversal(node->left, result);
        result.push_back(node->item);
        inorderTraversal(node->right, result);
    }
    
    void reverseInorderTraversal(BSTNode* node, std::vector<Item>& result) {
        if (node == nullptr) return;
        
        reverseInorderTraversal(node->right, result);
        result.push_back(node->item);
        reverseInorderTraversal(node->left, result);
    }
    
    void destroyTree(BSTNode* node) {
        if (node == nullptr) return;
        destroyTree(node->left);
        destroyTree(node->right);
        delete node;
    }
    
public:
    ItemBST() : root(nullptr) {}
    
    ~ItemBST() {
        destroyTree(root);
    }
    
    void insert(const Item& item) {
        root = insert(root, item);
    }
    
    std::vector<Item> getSortedHistory(bool ascending = true) {
        std::vector<Item> result;
        if (ascending) {
            inorderTraversal(root, result);
        } else {
            reverseInorderTraversal(root, result);
        }
        return result;
    }
    
    void clear() {
        destroyTree(root);
        root = nullptr;
    }
};

// ============================================================================
// INVERTED INDEX - For multi-field search (name + color + location)
// ============================================================================
class InvertedIndex {
private:
    std::unordered_map<std::string, std::set<std::string>> nameIndex;
    std::unordered_map<std::string, std::set<std::string>> colorIndex;
    std::unordered_map<std::string, std::set<std::string>> locationIndex;
    std::unordered_map<std::string, std::set<std::string>> categoryIndex;
    
    std::vector<std::string> tokenize(const std::string& text) {
        std::vector<std::string> tokens;
        std::string lower = text;
        std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
        
        std::istringstream iss(lower);
        std::string token;
        while (iss >> token) {
            tokens.push_back(token);
        }
        return tokens;
    }
    
public:
    void indexItem(const Item& item) {
        // Index by name tokens
        for (const auto& token : tokenize(item.name)) {
            nameIndex[token].insert(item.id);
        }
        
        // Index by color
        std::string lowerColor = item.color;
        std::transform(lowerColor.begin(), lowerColor.end(), lowerColor.begin(), ::tolower);
        colorIndex[lowerColor].insert(item.id);
        
        // Index by location
        std::string lowerLoc = item.location;
        std::transform(lowerLoc.begin(), lowerLoc.end(), lowerLoc.begin(), ::tolower);
        locationIndex[lowerLoc].insert(item.id);
        
        // Index by category
        categoryIndex[categoryToString(item.category)].insert(item.id);
    }
    
    void removeItem(const Item& item) {
        for (const auto& token : tokenize(item.name)) {
            nameIndex[token].erase(item.id);
        }
        std::string lowerColor = item.color;
        std::transform(lowerColor.begin(), lowerColor.end(), lowerColor.begin(), ::tolower);
        colorIndex[lowerColor].erase(item.id);
        
        std::string lowerLoc = item.location;
        std::transform(lowerLoc.begin(), lowerLoc.end(), lowerLoc.begin(), ::tolower);
        locationIndex[lowerLoc].erase(item.id);
        
        categoryIndex[categoryToString(item.category)].erase(item.id);
    }
    
    // Search with multiple optional filters - returns intersection of matching IDs
    std::set<std::string> search(const std::string& name = "", 
                                  const std::string& color = "", 
                                  const std::string& location = "",
                                  const std::string& category = "") {
        std::set<std::string> result;
        bool firstFilter = true;
        
        auto intersectOrInit = [&](const std::set<std::string>& matches) {
            if (firstFilter) {
                result = matches;
                firstFilter = false;
            } else {
                std::set<std::string> intersection;
                std::set_intersection(result.begin(), result.end(),
                                     matches.begin(), matches.end(),
                                     std::inserter(intersection, intersection.begin()));
                result = intersection;
            }
        };
        
        // Search by name tokens
        if (!name.empty()) {
            std::set<std::string> nameMatches;
            for (const auto& token : tokenize(name)) {
                if (nameIndex.find(token) != nameIndex.end()) {
                    for (const auto& id : nameIndex[token]) {
                        nameMatches.insert(id);
                    }
                }
            }
            intersectOrInit(nameMatches);
        }
        
        // Search by color
        if (!color.empty()) {
            std::string lowerColor = color;
            std::transform(lowerColor.begin(), lowerColor.end(), lowerColor.begin(), ::tolower);
            if (colorIndex.find(lowerColor) != colorIndex.end()) {
                intersectOrInit(colorIndex[lowerColor]);
            } else if (!firstFilter) {
                result.clear();
            }
        }
        
        // Search by location
        if (!location.empty()) {
            std::string lowerLoc = location;
            std::transform(lowerLoc.begin(), lowerLoc.end(), lowerLoc.begin(), ::tolower);
            if (locationIndex.find(lowerLoc) != locationIndex.end()) {
                intersectOrInit(locationIndex[lowerLoc]);
            } else if (!firstFilter) {
                result.clear();
            }
        }
        
        // Search by category
        if (!category.empty()) {
            std::string lowerCat = category;
            std::transform(lowerCat.begin(), lowerCat.end(), lowerCat.begin(), ::tolower);
            if (categoryIndex.find(lowerCat) != categoryIndex.end()) {
                intersectOrInit(categoryIndex[lowerCat]);
            } else if (!firstFilter) {
                result.clear();
            }
        }
        
        return result;
    }
    
    void clear() {
        nameIndex.clear();
        colorIndex.clear();
        locationIndex.clear();
        categoryIndex.clear();
    }
};

// ============================================================================
// LOCATION CLUSTER - Groups nearby locations using Union-Find
// ============================================================================
class LocationCluster {
private:
    std::unordered_map<std::string, std::string> parent;
    std::unordered_map<std::string, int> rank;
    LocationGraph* graph;
    int clusterRadius;
    
    std::string find(const std::string& loc) {
        std::string lower = loc;
        std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
        
        if (parent.find(lower) == parent.end()) {
            parent[lower] = lower;
            rank[lower] = 0;
        }
        
        if (parent[lower] != lower) {
            parent[lower] = find(parent[lower]); // Path compression
        }
        return parent[lower];
    }
    
    void unite(const std::string& loc1, const std::string& loc2) {
        std::string root1 = find(loc1);
        std::string root2 = find(loc2);
        
        if (root1 != root2) {
            // Union by rank
            if (rank[root1] < rank[root2]) {
                parent[root1] = root2;
            } else if (rank[root1] > rank[root2]) {
                parent[root2] = root1;
            } else {
                parent[root2] = root1;
                rank[root1]++;
            }
        }
    }
    
public:
    LocationCluster(LocationGraph* g = nullptr, int radius = 100) 
        : graph(g), clusterRadius(radius) {}
    
    void setGraph(LocationGraph* g) { graph = g; }
    
    void buildClusters() {
        if (!graph) return;
        
        auto locations = graph->getLocations();
        
        // Unite locations that are within clusterRadius of each other
        for (size_t i = 0; i < locations.size(); i++) {
            for (size_t j = i + 1; j < locations.size(); j++) {
                int dist = graph->getDistance(locations[i], locations[j]);
                if (dist <= clusterRadius) {
                    unite(locations[i], locations[j]);
                }
            }
        }
    }
    
    // Get all locations in the same cluster as the given location
    std::vector<std::string> getClusterMembers(const std::string& location) {
        std::vector<std::string> members;
        std::string root = find(location);
        
        for (const auto& pair : parent) {
            if (find(pair.first) == root) {
                members.push_back(pair.first);
            }
        }
        return members;
    }
    
    // Check if two locations are in the same cluster
    bool inSameCluster(const std::string& loc1, const std::string& loc2) {
        return find(loc1) == find(loc2);
    }
};

// ============================================================================
// CATEGORY TRIE MANAGER - Separate tries per category for faster search
// ============================================================================
class CategoryTrieManager {
private:
    std::unordered_map<Category, Trie*> categoryTries;
    Trie* globalTrie;  // Search across all categories
    
public:
    CategoryTrieManager() {
        globalTrie = new Trie();
        // Initialize a trie for each category
        for (int i = 0; i <= static_cast<int>(Category::OTHER); i++) {
            categoryTries[static_cast<Category>(i)] = new Trie();
        }
    }
    
    ~CategoryTrieManager() {
        delete globalTrie;
        for (auto& pair : categoryTries) {
            delete pair.second;
        }
    }
    
    void insert(const std::string& word, Category category) {
        globalTrie->insert(word);
        if (categoryTries.find(category) != categoryTries.end()) {
            categoryTries[category]->insert(word);
        }
    }
    
    std::vector<std::string> autocomplete(const std::string& prefix, int limit = 10) {
        return globalTrie->autocomplete(prefix, limit);
    }
    
    std::vector<std::string> autocompleteByCategory(const std::string& prefix, 
                                                      Category category, 
                                                      int limit = 10) {
        if (categoryTries.find(category) != categoryTries.end()) {
            return categoryTries[category]->autocomplete(prefix, limit);
        }
        return {};
    }
    
    void clear() {
        globalTrie->clear();
        for (auto& pair : categoryTries) {
            pair.second->clear();
        }
    }
};

#endif // DATA_STRUCTURES_H

