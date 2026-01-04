import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Loader2 } from 'lucide-react';
import { searchAutocomplete } from '../api';

function Search({ onSearch, onSelect }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length < 1) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            try {
                const results = await searchAutocomplete(query);
                setSuggestions(results);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Search error:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(fetchSuggestions, 200);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelect(suggestions[selectedIndex]);
                } else if (onSearch) {
                    onSearch(query);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelect = (suggestion) => {
        setQuery(suggestion);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        if (onSelect) {
            onSelect(suggestion);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Search Input */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>

                <div className="relative flex items-center">
                    <div className="absolute left-5 text-gray-400">
                        {isLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                        ) : (
                            <SearchIcon className="w-6 h-6" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => query.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search for lost items..."
                        className="w-full py-5 pl-14 pr-14 text-lg glass-input rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/30"
                        aria-label="Search lost items"
                        aria-autocomplete="list"
                        aria-controls="search-suggestions"
                        aria-expanded={showSuggestions}
                    />

                    {query && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-5 text-gray-400 hover:text-white transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    id="search-suggestions"
                    role="listbox"
                    className="absolute w-full mt-2 glass-card overflow-hidden z-50 slide-in"
                >
                    <ul className="py-2">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                role="option"
                                aria-selected={index === selectedIndex}
                                onClick={() => handleSelect(suggestion)}
                                className={`px-5 py-3 cursor-pointer flex items-center gap-3 transition-all duration-200 ${index === selectedIndex
                                        ? 'bg-purple-500/20 text-white'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <SearchIcon className="w-4 h-4 opacity-50" />
                                <span className="font-medium">{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* No results */}
            {showSuggestions && query.length > 0 && suggestions.length === 0 && !isLoading && (
                <div className="absolute w-full mt-2 glass-card p-4 text-center text-gray-400 z-50">
                    No items found matching "{query}"
                </div>
            )}
        </div>
    );
}

export default Search;
