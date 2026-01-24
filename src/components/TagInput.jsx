import React, { useState, useRef, useEffect } from 'react';
import { X, Hash } from 'lucide-react';

const TagInput = ({ tags = [], suggestions = [], onChange, placeholder = "พิมพ์แท็ก..." }) => {
    const [inputValue, setInputValue] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionRef = useRef(null);

    // Filter suggestions based on input
    useEffect(() => {
        if (!inputValue.trim()) {
            setFilteredSuggestions([]);
            return;
        }

        const filtered = suggestions
            .filter(tag =>
                tag.toLowerCase().includes(inputValue.toLowerCase()) &&
                !tags.includes(tag)
            )
            .slice(0, 5); // Show max 5 suggestions

        setFilteredSuggestions(filtered);
        setSelectedIndex(-1); // Reset selection
    }, [inputValue, tags, suggestions]);

    const addTag = (tag) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onChange([...tags, trimmedTag]);
        }
        setInputValue('');
        setFilteredSuggestions([]);
    };

    const removeTag = (tagToRemove) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
                addTag(filteredSuggestions[selectedIndex]);
            } else if (inputValue.trim()) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        } else if (e.key === 'Escape') {
            setFilteredSuggestions([]);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative group">
            <div
                className={`neo-input min-h-[48px] p-2 flex flex-wrap gap-2 cursor-text active:translate-x-[2px] active:translate-y-[2px] relative ${isFocused ? '!bg-white dark:!bg-zinc-700 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]' : 'dark:!bg-zinc-800'}`}
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map(tag => (
                    <span key={tag} className="bg-black text-white dark:bg-white dark:text-black px-2 py-1 text-sm font-bold flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                        <Hash size={12} />
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            className="bg-white/20 hover:bg-white/40 rounded-full p-0.5 ml-1 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow click on suggestion
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[120px] outline-none bg-transparent font-bold dark:text-white placeholder:font-normal placeholder:text-gray-400"
                />
            </div>

            {/* Suggestions Dropdown */}
            {isFocused && filteredSuggestions.length > 0 && (
                <div ref={suggestionRef} className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border-3 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50">
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={suggestion}
                            className={`px-3 py-2 cursor-pointer font-bold flex items-center gap-2 dark:text-white ${index === selectedIndex ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                            onClick={() => addTag(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <Hash size={14} />
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
