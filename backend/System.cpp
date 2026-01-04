//
// System.cpp - Implementation of save/load functionality
//

#include "System.h"
#include <fstream>
#include <sstream>

// Simple JSON-like save format (manual parsing to avoid external dependencies)
bool LostFoundSystem::saveToFile(const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) return false;
    
    std::vector<Item> items = getAllItems();
    
    file << "{\n";
    file << "  \"itemCounter\": " << itemCounter << ",\n";
    file << "  \"webhookUrl\": \"" << webhookUrl << "\",\n";
    file << "  \"claimWebhookUrl\": \"" << claimWebhookUrl << "\",\n";
    file << "  \"items\": [\n";
    
    for (size_t i = 0; i < items.size(); i++) {
        const auto& item = items[i];
        file << "    {\n";
        file << "      \"id\": \"" << item.id << "\",\n";
        file << "      \"name\": \"" << item.name << "\",\n";
        file << "      \"color\": \"" << item.color << "\",\n";
        file << "      \"location\": \"" << item.location << "\",\n";
        file << "      \"owner\": \"" << item.owner << "\",\n";
        file << "      \"email\": \"" << item.email << "\",\n";
        file << "      \"type\": \"" << item.type << "\",\n";
        file << "      \"timestamp\": " << item.timestamp << ",\n";
        file << "      \"description\": \"" << item.description << "\",\n";
        file << "      \"category\": \"" << categoryToString(item.category) << "\",\n";
        file << "      \"archived\": " << (item.archived ? "true" : "false") << ",\n";
        file << "      \"expiresAt\": " << item.expiresAt << ",\n";
        file << "      \"claimed\": " << (item.claimed ? "true" : "false") << ",\n";
        file << "      \"claimedBy\": \"" << item.claimedBy << "\",\n";
        file << "      \"claimedAt\": " << item.claimedAt << "\n";
        file << "    }";
        if (i < items.size() - 1) file << ",";
        file << "\n";
    }
    
    file << "  ]\n";
    file << "}\n";
    
    file.close();
    return true;
}

// Helper function to extract string value from JSON-like format
std::string extractJsonString(const std::string& line, const std::string& key) {
    size_t keyPos = line.find("\"" + key + "\"");
    if (keyPos == std::string::npos) return "";
    
    size_t colonPos = line.find(":", keyPos);
    if (colonPos == std::string::npos) return "";
    
    size_t startQuote = line.find("\"", colonPos);
    if (startQuote == std::string::npos) return "";
    
    size_t endQuote = line.find("\"", startQuote + 1);
    if (endQuote == std::string::npos) return "";
    
    return line.substr(startQuote + 1, endQuote - startQuote - 1);
}

long long extractJsonLong(const std::string& line, const std::string& key) {
    size_t keyPos = line.find("\"" + key + "\"");
    if (keyPos == std::string::npos) return 0;
    
    size_t colonPos = line.find(":", keyPos);
    if (colonPos == std::string::npos) return 0;
    
    std::string numStr;
    for (size_t i = colonPos + 1; i < line.length(); i++) {
        char c = line[i];
        if (isdigit(c) || c == '-') {
            numStr += c;
        } else if (!numStr.empty()) {
            break;
        }
    }
    
    return numStr.empty() ? 0 : std::stoll(numStr);
}

int extractJsonInt(const std::string& line, const std::string& key) {
    return static_cast<int>(extractJsonLong(line, key));
}

bool extractJsonBool(const std::string& line, const std::string& key) {
    size_t keyPos = line.find("\"" + key + "\"");
    if (keyPos == std::string::npos) return false;
    
    size_t colonPos = line.find(":", keyPos);
    if (colonPos == std::string::npos) return false;
    
    std::string rest = line.substr(colonPos + 1);
    // Trim whitespace
    size_t start = rest.find_first_not_of(" \t");
    if (start != std::string::npos) {
        rest = rest.substr(start);
    }
    
    return rest.find("true") == 0;
}

bool LostFoundSystem::loadFromFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) return false;
    
    std::string content((std::istreambuf_iterator<char>(file)),
                        std::istreambuf_iterator<char>());
    file.close();
    
    // Parse itemCounter
    itemCounter = extractJsonInt(content, "itemCounter");
    
    // Parse webhookUrl
    webhookUrl = extractJsonString(content, "webhookUrl");
    
    // Parse claimWebhookUrl
    claimWebhookUrl = extractJsonString(content, "claimWebhookUrl");
    
    // Parse items
    size_t itemsStart = content.find("\"items\"");
    if (itemsStart == std::string::npos) return true; // No items yet
    
    size_t pos = content.find("{", itemsStart);
    while (pos != std::string::npos && pos < content.length()) {
        size_t itemEnd = content.find("}", pos);
        if (itemEnd == std::string::npos) break;
        
        std::string itemBlock = content.substr(pos, itemEnd - pos + 1);
        
        Item item;
        item.id = extractJsonString(itemBlock, "id");
        item.name = extractJsonString(itemBlock, "name");
        item.color = extractJsonString(itemBlock, "color");
        item.location = extractJsonString(itemBlock, "location");
        item.owner = extractJsonString(itemBlock, "owner");
        item.email = extractJsonString(itemBlock, "email");
        item.type = extractJsonString(itemBlock, "type");
        item.timestamp = extractJsonLong(itemBlock, "timestamp");
        item.description = extractJsonString(itemBlock, "description");
        
        // New fields
        std::string catStr = extractJsonString(itemBlock, "category");
        item.category = catStr.empty() ? Category::OTHER : stringToCategory(catStr);
        item.archived = extractJsonBool(itemBlock, "archived");
        item.archived = extractJsonBool(itemBlock, "archived");
        item.expiresAt = extractJsonLong(itemBlock, "expiresAt");
        item.claimed = extractJsonBool(itemBlock, "claimed");
        item.claimedBy = extractJsonString(itemBlock, "claimedBy");
        item.claimedAt = extractJsonLong(itemBlock, "claimedAt");
        
        // If expiresAt not set (old data), calculate it
        if (item.expiresAt == 0 && item.timestamp > 0) {
            item.expiresAt = item.timestamp + (EXPIRATION_DAYS * 24 * 60 * 60);
        }
        
        if (!item.id.empty()) {
            itemMap.insert(item.id, item);
            searchTrie.insert(item.name);
            historyBST.insert(item);
            invertedIndex.indexItem(item);
            categoryTries.insert(item.name, item.category);
        }
        
        pos = content.find("{", itemEnd);
    }
    
    return true;
}
