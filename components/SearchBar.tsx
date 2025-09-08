import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <input
        type="text"
        placeholder="Bir simülasyon ara... (örn: Alien Hominid)"
        className="w-full p-4 pl-12 bg-dark-gray border border-cyber-gray/50 rounded-lg text-ghost-white focus:outline-none focus:ring-2 focus:ring-electric-purple transition-all"
        onChange={(e) => onSearch(e.target.value)}
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-gray" size={20} />
    </div>
  );
};

export default SearchBar;