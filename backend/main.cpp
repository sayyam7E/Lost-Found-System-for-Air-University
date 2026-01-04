//
// main.cpp - Lost & Found REST API Server
// Uses cpp-httplib for HTTP server functionality
//

#ifdef _WIN32
#define _WIN32_WINNT 0x0601
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#endif

#include <iostream>
#include <string>
#include <sstream>
#include <fstream>
#include <ctime>
#include <thread>
#include <atomic>
#include <csignal>

#include "System.h"

// ============================================================================
// MINIMAL HTTP SERVER IMPLEMENTATION (No external dependencies)
// ============================================================================

#ifdef _WIN32
typedef SOCKET socket_t;
#define CLOSE_SOCKET closesocket
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <netdb.h>
typedef int socket_t;
#define CLOSE_SOCKET close
#define INVALID_SOCKET -1
#define SOCKET_ERROR -1
#endif

// ============================================================================
// WEBHOOK HTTP CLIENT - Send GET requests to n8n Cloud
// ============================================================================
std::string urlEncode(const std::string& str) {
    std::ostringstream encoded;
    for (unsigned char c : str) {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            encoded << c;
        } else {
            encoded << '%' << std::uppercase << std::hex << std::setw(2) << std::setfill('0') << (int)c;
        }
    }
    return encoded.str();
}

bool sendWebhookNotification(const std::string& webhookUrl, const std::string& jsonPayload) {
    if (webhookUrl.empty()) return false;
    
    std::cout << "📤 Sending webhook to: " << webhookUrl << std::endl;
    
    // URL-encode the JSON payload for GET request
    std::string encodedPayload = urlEncode(jsonPayload);
    
    // Build curl command - using GET with data as query parameter
    std::stringstream cmd;
    cmd << "curl -k -L -s --connect-timeout 10 \""
        << webhookUrl << "?data=" << encodedPayload 
        << "\" > nul 2>&1";
    
    std::cout << "📧 Executing webhook GET..." << std::endl;
    int result = std::system(cmd.str().c_str());
    
    if (result == 0) {
        std::cout << "✅ Webhook notification sent successfully!" << std::endl;
        return true;
    } else {
        std::cout << "❌ Webhook notification failed (exit code: " << result << ")" << std::endl;
        return false;
    }
}

class HttpServer {
private:
    socket_t serverSocket;
    int port;
    std::atomic<bool> running;
    LostFoundSystem& system;
    
    struct HttpRequest {
        std::string method;
        std::string path;
        std::string query;
        std::string body;
        std::unordered_map<std::string, std::string> headers;
    };
    
    struct HttpResponse {
        int status;
        std::string statusText;
        std::string contentType;
        std::string body;
        
        HttpResponse() : status(200), statusText("OK"), contentType("application/json") {}
    };
    
    std::string extractJsonValue(const std::string& json, const std::string& key) {
        std::string searchKey = "\"" + key + "\"";
        size_t keyPos = json.find(searchKey);
        if (keyPos == std::string::npos) return "";
        
        size_t colonPos = json.find(":", keyPos);
        if (colonPos == std::string::npos) return "";
        
        // Skip whitespace
        size_t valueStart = colonPos + 1;
        while (valueStart < json.length() && (json[valueStart] == ' ' || json[valueStart] == '\t')) {
            valueStart++;
        }
        
        if (json[valueStart] == '"') {
            // String value
            size_t endQuote = json.find("\"", valueStart + 1);
            if (endQuote == std::string::npos) return "";
            return json.substr(valueStart + 1, endQuote - valueStart - 1);
        }
        
        return "";
    }
    
    std::string buildJsonResponse(const std::vector<Item>& items) {
        std::stringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < items.size(); i++) {
            const auto& item = items[i];
            ss << "  {\n";
            ss << "    \"id\": \"" << item.id << "\",\n";
            ss << "    \"name\": \"" << item.name << "\",\n";
            ss << "    \"color\": \"" << item.color << "\",\n";
            ss << "    \"location\": \"" << item.location << "\",\n";
            ss << "    \"owner\": \"" << item.owner << "\",\n";
            ss << "    \"type\": \"" << item.type << "\",\n";
            ss << "    \"timestamp\": " << item.timestamp << ",\n";
            ss << "    \"description\": \"" << item.description << "\",\n";
            ss << "    \"category\": \"" << categoryToString(item.category) << "\",\n";
            ss << "    \"archived\": " << (item.archived ? "true" : "false") << ",\n";
            ss << "    \"expiresAt\": " << item.expiresAt << "\n";
            ss << "  }";
            if (i < items.size() - 1) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }
    
    std::string buildMatchesJson(const std::vector<MatchCandidate>& matches) {
        std::stringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < matches.size(); i++) {
            const auto& match = matches[i];
            ss << "  {\n";
            ss << "    \"itemId\": \"" << match.itemId << "\",\n";
            ss << "    \"itemName\": \"" << match.itemName << "\",\n";
            ss << "    \"owner\": \"" << match.owner << "\",\n";
            ss << "    \"location\": \"" << match.location << "\",\n";
            ss << "    \"color\": \"" << match.color << "\",\n";
            ss << "    \"score\": " << match.score << ",\n";
            ss << "    \"nameScore\": " << match.nameScore << ",\n";
            ss << "    \"colorScore\": " << match.colorScore << ",\n";
            ss << "    \"proximityScore\": " << match.proximityScore << "\n";
            ss << "  }";
            if (i < matches.size() - 1) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }
    
    std::string buildSuggestionsJson(const std::vector<std::string>& suggestions) {
        std::stringstream ss;
        ss << "[";
        for (size_t i = 0; i < suggestions.size(); i++) {
            ss << "\"" << suggestions[i] << "\"";
            if (i < suggestions.size() - 1) ss << ", ";
        }
        ss << "]";
        return ss.str();
    }
    
    std::string buildLocationsJson(const std::vector<std::string>& locations) {
        std::stringstream ss;
        ss << "[";
        for (size_t i = 0; i < locations.size(); i++) {
            ss << "\"" << locations[i] << "\"";
            if (i < locations.size() - 1) ss << ", ";
        }
        ss << "]";
        return ss.str();
    }

    std::string buildAnalyticsJson(const AnalyticsData& data) {
        std::stringstream ss;
        ss << "{\n";
        ss << "  \"totalItems\": " << data.totalItems << ",\n";
        ss << "  \"claimedItems\": " << data.claimedItems << ",\n";
        ss << "  \"successRate\": " << data.successRate << ",\n";
        ss << "  \"averageClaimTimeHours\": " << data.avgClaimTimeHours << ",\n";
        
        // Top Categories
        ss << "  \"topCategories\": [\n";
        int count = 0;
        for (const auto& pair : data.categoryStats) {
            ss << "    {\"category\": \"" << pair.first << "\", \"count\": " << pair.second << "}";
            if (count < data.categoryStats.size() - 1) ss << ",";
            ss << "\n";
            count++;
        }
        ss << "  ],\n";
        
        // Top Locations
        ss << "  \"topLocations\": [\n";
        count = 0;
        for (const auto& pair : data.locationStats) {
            ss << "    {\"location\": \"" << pair.first << "\", \"count\": " << pair.second << "}";
            if (count < data.locationStats.size() - 1) ss << ",";
            ss << "\n";
            count++;
        }
        ss << "  ]\n";
        ss << "}";
        return ss.str();
    }
    
    HttpRequest parseRequest(const std::string& raw) {
        HttpRequest req;
        std::istringstream stream(raw);
        std::string line;
        
        // Parse first line: METHOD /path HTTP/1.1
        if (std::getline(stream, line)) {
            std::istringstream lineStream(line);
            lineStream >> req.method;
            std::string fullPath;
            lineStream >> fullPath;
            
            // Split path and query
            size_t queryPos = fullPath.find("?");
            if (queryPos != std::string::npos) {
                req.path = fullPath.substr(0, queryPos);
                req.query = fullPath.substr(queryPos + 1);
            } else {
                req.path = fullPath;
            }
        }
        
        // Parse headers
        while (std::getline(stream, line) && line != "\r" && !line.empty()) {
            size_t colonPos = line.find(":");
            if (colonPos != std::string::npos) {
                std::string key = line.substr(0, colonPos);
                std::string value = line.substr(colonPos + 2);
                // Trim carriage return
                if (!value.empty() && value.back() == '\r') {
                    value.pop_back();
                }
                req.headers[key] = value;
            }
        }
        
        // Parse body (rest of the content)
        std::stringstream bodyStream;
        while (std::getline(stream, line)) {
            bodyStream << line;
        }
        req.body = bodyStream.str();
        
        return req;
    }
    
    std::string buildResponse(const HttpResponse& res) {
        std::stringstream ss;
        ss << "HTTP/1.1 " << res.status << " " << res.statusText << "\r\n";
        ss << "Content-Type: " << res.contentType << "\r\n";
        ss << "Content-Length: " << res.body.length() << "\r\n";
        ss << "Access-Control-Allow-Origin: *\r\n";
        ss << "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
        ss << "Access-Control-Allow-Headers: Content-Type, Authorization\r\n";
        ss << "Connection: close\r\n";
        ss << "\r\n";
        ss << res.body;
        return ss.str();
    }
    
    std::string getQueryParam(const std::string& query, const std::string& key) {
        std::string searchKey = key + "=";
        size_t pos = query.find(searchKey);
        if (pos == std::string::npos) return "";
        
        size_t valueStart = pos + searchKey.length();
        size_t valueEnd = query.find("&", valueStart);
        if (valueEnd == std::string::npos) {
            return query.substr(valueStart);
        }
        return query.substr(valueStart, valueEnd - valueStart);
    }
    
    // URL decode
    std::string urlDecode(const std::string& str) {
        std::string result;
        for (size_t i = 0; i < str.length(); i++) {
            if (str[i] == '%' && i + 2 < str.length()) {
                int value;
                std::istringstream iss(str.substr(i + 1, 2));
                if (iss >> std::hex >> value) {
                    result += static_cast<char>(value);
                    i += 2;
                } else {
                    result += str[i];
                }
            } else if (str[i] == '+') {
                result += ' ';
            } else {
                result += str[i];
            }
        }
        return result;
    }
    
    HttpResponse handleRequest(const HttpRequest& req) {
        HttpResponse res;
        
        std::cout << "[" << req.method << "] " << req.path << std::endl;
        
        // Handle CORS preflight
        if (req.method == "OPTIONS") {
            res.status = 204;
            res.statusText = "No Content";
            res.body = "";
            return res;
        }
        
        // Route handling
        if (req.path == "/api/lost" && req.method == "POST") {
            // Report lost item
            std::string name = extractJsonValue(req.body, "name");
            std::string color = extractJsonValue(req.body, "color");
            std::string location = extractJsonValue(req.body, "location");
            std::string owner = extractJsonValue(req.body, "owner");
            std::string email = extractJsonValue(req.body, "email");
            std::string description = extractJsonValue(req.body, "description");
            std::string category = extractJsonValue(req.body, "category");
            
            if (name.empty() || location.empty() || owner.empty() || description.empty()) {
                res.status = 400;
                res.statusText = "Bad Request";
                res.body = "{\"error\": \"Missing required fields: name, location, owner, description\"}";
                return res;
            }
            
            std::string id = system.reportLostItem(name, color, location, owner, description, category, email);
            system.saveToFile("data.json");
            
            res.body = "{\"success\": true, \"id\": \"" + id + "\", \"message\": \"Lost item reported successfully\"}";
        }
        else if (req.path == "/api/found" && req.method == "POST") {
            // Report found item and get matches
            std::string name = extractJsonValue(req.body, "name");
            std::string color = extractJsonValue(req.body, "color");
            std::string location = extractJsonValue(req.body, "location");
            std::string finder = extractJsonValue(req.body, "finder");
            std::string finderPhone = extractJsonValue(req.body, "finderPhone");
            std::string finderEmail = extractJsonValue(req.body, "finderEmail");
            std::string description = extractJsonValue(req.body, "description");
            std::string category = extractJsonValue(req.body, "category");
            
            if (name.empty() || location.empty() || description.empty()) {
                res.status = 400;
                res.statusText = "Bad Request";
                res.body = "{\"error\": \"Missing required fields: name, location, description\"}";
                return res;
            }
            
            auto matches = system.reportFoundItem(name, color, location, finder, description, category, finderEmail);
            system.saveToFile("data.json");
            
            // Trigger n8n webhook if configured and matches found
            if (!system.getWebhookUrl().empty() && !matches.empty()) {
                std::cout << "🔔 Webhook trigger: " << matches.size() << " matches found" << std::endl;
                
                // Build JSON payload for n8n with comprehensive data for LLM analysis
                std::stringstream webhookPayload;
                webhookPayload << "{";
                webhookPayload << "\"event\":\"match_found\",";
                webhookPayload << "\"foundItem\":{";
                webhookPayload << "\"name\":\"" << name << "\",";
                webhookPayload << "\"description\":\"" << description << "\",";
                webhookPayload << "\"color\":\"" << color << "\",";
                webhookPayload << "\"location\":\"" << location << "\",";
                webhookPayload << "\"finder\":\"" << finder << "\",";
                webhookPayload << "\"finderPhone\":\"" << finderPhone << "\",";
                webhookPayload << "\"category\":\"" << category << "\",";
                webhookPayload << "\"reportedAt\":" << std::time(nullptr);
                webhookPayload << "},";
                webhookPayload << "\"matchCount\":" << matches.size() << ",";
                webhookPayload << "\"matches\":[";
                
                for (size_t i = 0; i < matches.size(); i++) {
                    const auto& m = matches[i];
                    // Get the full item to access email and other details
                    Item* matchedItem = system.getItemById(m.itemId);
                    std::string ownerEmail = matchedItem ? matchedItem->email : "";
                    
                    webhookPayload << "{";
                    webhookPayload << "\"itemId\":\"" << m.itemId << "\",";
                    webhookPayload << "\"itemName\":\"" << m.itemName << "\",";
                    webhookPayload << "\"description\":\"" << (matchedItem ? matchedItem->description : "") << "\",";
                    webhookPayload << "\"owner\":\"" << m.owner << "\",";
                    webhookPayload << "\"email\":\"" << ownerEmail << "\",";
                    webhookPayload << "\"location\":\"" << m.location << "\",";
                    webhookPayload << "\"color\":\"" << m.color << "\",";
                    webhookPayload << "\"category\":\"" << (matchedItem ? categoryToString(matchedItem->category) : "") << "\",";
                    webhookPayload << "\"reportedAt\":" << (matchedItem ? matchedItem->timestamp : 0) << ",";
                    webhookPayload << "\"score\":" << m.score << ",";
                    webhookPayload << "\"scoreBreakdown\":{";
                    webhookPayload << "\"nameScore\":" << m.nameScore << ",";
                    webhookPayload << "\"colorScore\":" << m.colorScore << ",";
                    webhookPayload << "\"proximityScore\":" << m.proximityScore;
                    webhookPayload << "}";
                    webhookPayload << "}";
                    if (i < matches.size() - 1) webhookPayload << ",";
                }
                webhookPayload << "]";
                webhookPayload << "}";
                
                // Send webhook in background thread to not block response
                std::thread([webhookUrl = system.getWebhookUrl(), payload = webhookPayload.str()]() {
                    sendWebhookNotification(webhookUrl, payload);
                }).detach();
            }
            
            std::stringstream ss;
            ss << "{\"success\": true, \"matches\": " << buildMatchesJson(matches) << "}";
            res.body = ss.str();
        }
        else if (req.path == "/api/search" && req.method == "GET") {
            // Autocomplete search
            std::string query = urlDecode(getQueryParam(req.query, "q"));
            std::string category = urlDecode(getQueryParam(req.query, "category"));
            
            std::vector<std::string> suggestions;
            if (!category.empty()) {
                suggestions = system.searchAutocompleteByCategory(query, category);
            } else {
                suggestions = system.searchAutocomplete(query);
            }
            res.body = buildSuggestionsJson(suggestions);
        }
        else if (req.path == "/api/search/advanced" && req.method == "GET") {
            // Advanced search with multiple filters
            std::string name = urlDecode(getQueryParam(req.query, "name"));
            std::string color = urlDecode(getQueryParam(req.query, "color"));
            std::string location = urlDecode(getQueryParam(req.query, "location"));
            std::string category = urlDecode(getQueryParam(req.query, "category"));
            std::string type = urlDecode(getQueryParam(req.query, "type"));
            std::string dateFromStr = getQueryParam(req.query, "dateFrom");
            std::string dateToStr = getQueryParam(req.query, "dateTo");
            std::string includeArchivedStr = getQueryParam(req.query, "includeArchived");
            
            long long dateFrom = dateFromStr.empty() ? 0 : std::stoll(dateFromStr);
            long long dateTo = dateToStr.empty() ? 0 : std::stoll(dateToStr);
            bool includeArchived = includeArchivedStr == "true";
            
            auto items = system.advancedSearch(name, color, location, category, type, dateFrom, dateTo, includeArchived);
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/history" && req.method == "GET") {
            // Get sorted history
            auto items = system.getHistory(false);
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/items" && req.method == "GET") {
            // Get all items (active only by default)
            auto items = system.getActiveItems();
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/items/active" && req.method == "GET") {
            // Get active (non-archived) items
            auto items = system.getActiveItems();
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/items/archived" && req.method == "GET") {
            // Get archived items
            auto items = system.getArchivedItems();
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/locations" && req.method == "GET") {
            // Get available locations
            auto locations = system.getLocations();
            res.body = buildLocationsJson(locations);
        }
        else if (req.path == "/api/categories" && req.method == "GET") {
            // Get all categories
            auto categories = system.getCategories();
            res.body = buildLocationsJson(categories);  // Reuse string array builder
        }
        else if (req.path.rfind("/api/category/", 0) == 0 && req.method == "GET") {
            // Get items by category
            std::string categoryName = req.path.substr(14);  // Extract category after "/api/category/"
            auto items = system.getItemsByCategory(categoryName);
            res.body = buildJsonResponse(items);
        }
        else if (req.path == "/api/lost" && req.method == "GET") {
            // Get all lost items (active only)
            auto allItems = system.getItemsByType("lost");
            std::vector<Item> activeItems;
            for (const auto& item : allItems) {
                if (!item.archived) activeItems.push_back(item);
            }
            res.body = buildJsonResponse(activeItems);
        }
        else if (req.path == "/api/found" && req.method == "GET") {
            // Get all found items (active only)
            auto allItems = system.getItemsByType("found");
            std::vector<Item> activeItems;
            for (const auto& item : allItems) {
                if (!item.archived) activeItems.push_back(item);
            }
            res.body = buildJsonResponse(activeItems);
        }
        else if (req.path == "/api/stats" && req.method == "GET") {
            // Get statistics
            std::stringstream ss;
            ss << "{";
            ss << "\"totalItems\": " << system.getTotalItems() << ",";
            ss << "\"activeItems\": " << system.getActiveItemCount() << ",";
            ss << "\"archivedItems\": " << system.getArchivedItemCount() << ",";
            ss << "\"lostItems\": " << system.getItemsByType("lost").size() << ",";
            ss << "\"foundItems\": " << system.getItemsByType("found").size();
            ss << "}";
            res.body = ss.str();
        }
        else if (req.path == "/api/webhook/config" && req.method == "POST") {
            // Configure n8n webhook URL
            std::string url = extractJsonValue(req.body, "url");
            system.setWebhookUrl(url);
            system.saveToFile("data.json");
            res.body = "{\"success\": true, \"message\": \"Webhook URL configured\", \"url\": \"" + url + "\"}";
        }
        else if (req.path == "/api/webhook/config" && req.method == "GET") {
            // Get webhook configuration
            res.body = "{\"url\": \"" + system.getWebhookUrl() + "\"}";
        }
        else if (req.path == "/api/archive/expired" && req.method == "POST") {
            // Manually trigger expiration check
            int archived = system.archiveExpiredItems();
            system.saveToFile("data.json");
            std::stringstream ss;
            ss << "{\"success\": true, \"archivedCount\": " << archived << "}";
            res.body = ss.str();
        }
        else if (req.path == "/api/analytics" && req.method == "GET") {
            // Get detailed analytics
            AnalyticsData data = system.getAnalytics();
            res.body = buildAnalyticsJson(data);
        }
        else if (req.path.rfind("/api/item/", 0) == 0 && req.path.find("/claim") != std::string::npos && req.method == "POST") {
            // Claim item: /api/item/{id}/claim
            size_t claimPos = req.path.find("/claim");
            std::string itemId = req.path.substr(10, claimPos - 10);
            std::string claimedBy = extractJsonValue(req.body, "claimedBy");
            std::string claimerPhone = extractJsonValue(req.body, "claimerPhone");
            
            if (claimedBy.empty()) {
                res.status = 400;
                res.body = "{\"error\": \"Missing claimedBy field\"}";
                return res;
            }
            
            if (claimerPhone.empty()) {
                res.status = 400;
                res.body = "{\"error\": \"Missing claimerPhone field\"}";
                return res;
            }
            
            bool success = system.claimItem(itemId, claimedBy);
            if (success) {
                system.saveToFile("data.json");
                
                // Trigger webhook for claiming - send to claimWebhookUrl if configured
                std::string claimWebhookUrl = system.getClaimWebhookUrl();
                Item* item = system.getItemById(itemId);
                if (item && !claimWebhookUrl.empty()) {
                    std::stringstream webhookPayload;
                    webhookPayload << "{";
                    webhookPayload << "\"event\":\"item_claimed_notification\",";
                    webhookPayload << "\"claimer\":{";
                    webhookPayload << "\"name\":\"" << claimedBy << "\",";
                    webhookPayload << "\"phone\":\"" << claimerPhone << "\"";
                    webhookPayload << "},";
                    webhookPayload << "\"founder\":{";
                    webhookPayload << "\"name\":\"" << item->owner << "\",";
                    webhookPayload << "\"email\":\"" << item->email << "\"";
                    webhookPayload << "},";
                    webhookPayload << "\"item\":{";
                    webhookPayload << "\"id\":\"" << item->id << "\",";
                    webhookPayload << "\"name\":\"" << item->name << "\",";
                    webhookPayload << "\"description\":\"" << item->description << "\",";
                    webhookPayload << "\"color\":\"" << item->color << "\",";
                    webhookPayload << "\"location\":\"" << item->location << "\",";
                    webhookPayload << "\"category\":\"" << categoryToString(item->category) << "\"";
                    webhookPayload << "},";
                    webhookPayload << "\"claimedAt\":" << item->claimedAt;
                    webhookPayload << "}";
                    
                    // Send webhook in background thread to not block response
                    std::thread([claimWebhookUrl, payload = webhookPayload.str()]() {
                        sendWebhookNotification(claimWebhookUrl, payload);
                    }).detach();
                }
                
                res.body = "{\"success\": true, \"message\": \"Item claimed successfully\"}";
            } else {
                res.status = 404;
                res.body = "{\"error\": \"Item not found\"}";
            }
        }
        else if (req.path.rfind("/api/item/", 0) == 0 && req.path.find("/archive") != std::string::npos && req.method == "POST") {
            // Archive specific item
            size_t archivePos = req.path.find("/archive");
            std::string itemId = req.path.substr(10, archivePos - 10);
            
            bool archived = system.archiveItem(itemId);
            if (archived) {
                system.saveToFile("data.json");
                res.body = "{\"success\": true, \"message\": \"Item archived\"}";
            } else {
                res.status = 404;
                res.statusText = "Not Found";
                res.body = "{\"error\": \"Item not found\"}";
            }
        }
        else if (req.path == "/api/webhook" && req.method == "GET") {
            // Get current webhook URL
            res.body = "{\"webhookUrl\": \"" + system.getWebhookUrl() + "\"}";
        }
        else if (req.path == "/api/webhook" && req.method == "POST") {
            // Update webhook URL
            std::string url = extractJsonValue(req.body, "url");
            if (url.empty()) {
                res.status = 400;
                res.statusText = "Bad Request";
                res.body = "{\"error\": \"URL is required\"}";
            } else {
                system.setWebhookUrl(url);
                system.saveToFile("data.json");
                res.body = "{\"success\": true, \"webhookUrl\": \"" + url + "\"}";
            }
        }
        else if (req.path == "/api/webhook/claim" && req.method == "GET") {
            // Get current claim webhook URL
            res.body = "{\"claimWebhookUrl\": \"" + system.getClaimWebhookUrl() + "\"}";
        }
        else if (req.path == "/api/webhook/claim" && req.method == "POST") {
            // Update claim webhook URL
            std::string url = extractJsonValue(req.body, "url");
            if (url.empty()) {
                res.status = 400;
                res.statusText = "Bad Request";
                res.body = "{\"error\": \"URL is required\"}";
            } else {
                system.setClaimWebhookUrl(url);
                system.saveToFile("data.json");
                res.body = "{\"success\": true, \"claimWebhookUrl\": \"" + url + "\"}";
            }
        }
        else if (req.path == "/" || req.path == "/api") {
            // API info
            res.body = "{\"name\": \"Lost & Found API\", \"version\": \"2.0.0\", \"status\": \"running\", \"features\": [\"categories\", \"advanced-search\", \"expiration\", \"webhooks\"]}";
        }
        else if (req.path.rfind("/api/item/", 0) == 0 && req.method == "DELETE") {
            // Delete item by ID
            std::string itemId = req.path.substr(10); // Extract ID after "/api/item/"
            
            if (itemId.empty()) {
                res.status = 400;
                res.statusText = "Bad Request";
                res.body = "{\"error\": \"Item ID is required\"}";
                return res;
            }
            
            bool deleted = system.deleteItem(itemId);
            
            if (deleted) {
                system.saveToFile("data.json");
                res.body = "{\"success\": true, \"message\": \"Item deleted successfully\"}";
            } else {
                res.status = 404;
                res.statusText = "Not Found";
                res.body = "{\"error\": \"Item not found\"}";
            }
        }
        else {
            res.status = 404;
            res.statusText = "Not Found";
            res.body = "{\"error\": \"Endpoint not found\"}";
        }
        
        return res;
    }
    
    void handleClient(socket_t clientSocket) {
        char buffer[8192] = {0};
        int bytesRead = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
        
        if (bytesRead > 0) {
            std::string request(buffer, bytesRead);
            HttpRequest req = parseRequest(request);
            HttpResponse res = handleRequest(req);
            std::string response = buildResponse(res);
            
            send(clientSocket, response.c_str(), response.length(), 0);
        }
        
        CLOSE_SOCKET(clientSocket);
    }
    
public:
    HttpServer(int port, LostFoundSystem& sys) : port(port), running(false), system(sys) {
        serverSocket = INVALID_SOCKET;
    }
    
    bool start() {
#ifdef _WIN32
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
            std::cerr << "WSAStartup failed" << std::endl;
            return false;
        }
#endif
        
        serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (serverSocket == INVALID_SOCKET) {
            std::cerr << "Failed to create socket" << std::endl;
            return false;
        }
        
        // Allow port reuse
        int opt = 1;
#ifdef _WIN32
        setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
#else
        setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif
        
        struct sockaddr_in serverAddr;
        serverAddr.sin_family = AF_INET;
        serverAddr.sin_addr.s_addr = INADDR_ANY;
        serverAddr.sin_port = htons(port);
        
        if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
            std::cerr << "Bind failed" << std::endl;
            CLOSE_SOCKET(serverSocket);
            return false;
        }
        
        if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
            std::cerr << "Listen failed" << std::endl;
            CLOSE_SOCKET(serverSocket);
            return false;
        }
        
        running = true;
        
        std::cout << "\n";
        std::cout << "╔══════════════════════════════════════════════════════════╗\n";
        std::cout << "║       LOST & FOUND INTELLIGENCE SYSTEM - API SERVER      ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════╣\n";
        std::cout << "║  Server running on: http://localhost:" << port << "                 ║\n";
        std::cout << "║  Press Ctrl+C to stop                                    ║\n";
        std::cout << "╠══════════════════════════════════════════════════════════╣\n";
        std::cout << "║  Endpoints:                                              ║\n";
        std::cout << "║  • POST /api/lost    - Report lost item                  ║\n";
        std::cout << "║  • POST /api/found   - Report found item & get matches   ║\n";
        std::cout << "║  • GET  /api/search  - Autocomplete suggestions          ║\n";
        std::cout << "║  • GET  /api/history - Sorted history (BST)              ║\n";
        std::cout << "║  • GET  /api/locations - Available locations             ║\n";
        std::cout << "║  • GET  /api/stats   - System statistics                 ║\n";
        std::cout << "╚══════════════════════════════════════════════════════════╝\n";
        std::cout << "\n";
        
        while (running) {
            struct sockaddr_in clientAddr;
            int clientAddrLen = sizeof(clientAddr);
            
            socket_t clientSocket = accept(serverSocket, (struct sockaddr*)&clientAddr, 
#ifdef _WIN32
                (int*)&clientAddrLen
#else
                (socklen_t*)&clientAddrLen
#endif
            );
            
            if (clientSocket != INVALID_SOCKET) {
                std::thread(&HttpServer::handleClient, this, clientSocket).detach();
            }
        }
        
        return true;
    }
    
    void stop() {
        running = false;
        CLOSE_SOCKET(serverSocket);
#ifdef _WIN32
        WSACleanup();
#endif
    }
};

// Global server pointer for signal handling
HttpServer* globalServer = nullptr;
LostFoundSystem* globalSystem = nullptr;

void signalHandler(int signal) {
    std::cout << "\nShutting down server..." << std::endl;
    if (globalSystem) {
        globalSystem->saveToFile("data.json");
        std::cout << "Data saved to data.json" << std::endl;
    }
    if (globalServer) {
        globalServer->stop();
    }
    exit(0);
}

int main() {
    std::cout << "Initializing Lost & Found System..." << std::endl;
    
    LostFoundSystem system;
    globalSystem = &system;
    
    // Load existing data
    if (system.loadFromFile("data.json")) {
        std::cout << "Loaded existing data (" << system.getTotalItems() << " items)" << std::endl;
    } else {
        std::cout << "Starting with fresh database" << std::endl;
    }
    
    // Create and start server
    HttpServer server(8080, system);
    globalServer = &server;
    
    // Set up signal handler for graceful shutdown
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    // Start server
    if (!server.start()) {
        std::cerr << "Failed to start server" << std::endl;
        return 1;
    }
    
    return 0;
}
