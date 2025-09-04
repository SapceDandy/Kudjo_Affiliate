'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from './loading-spinner';
import { MapPin, CheckCircle } from 'lucide-react';

interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeData?: PlaceResult) => void;
  onVerified: (verified: boolean, placeData?: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onVerified,
  placeholder = "Start typing your business address...",
  className = "",
  error
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use OpenStreetMap Nominatim API for real geocoding
  const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
    if (query.length < 3) return [];
    
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching places:', error);
      return [];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedPlace(null);
    onVerified(false);
    
    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (newValue.length >= 3) {
      setLoading(true);
      
      // Debounce the API call by 300ms to reduce flickering
      debounceRef.current = setTimeout(async () => {
        try {
          const places = await searchPlaces(newValue);
          setSuggestions(places);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching places:', error);
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    onChange(place.formatted_address, place);
    onVerified(true, place);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const getCityFromPlace = (place: PlaceResult): string => {
    // Try multiple city-related types
    const cityComponent = place.address_components.find(component =>
      component.types.includes('locality') || 
      component.types.includes('city') ||
      component.types.includes('town') ||
      component.types.includes('village') ||
      component.types.includes('municipality')
    );
    
    // If we have a city component, use it
    if (cityComponent) {
      return cityComponent.long_name;
    }
    
    // If no city found, try to extract from formatted address
    if (place.formatted_address) {
      const parts = place.formatted_address.split(',').map(p => p.trim());
      // Look for a part that's not a state (typically states are 2-4 chars or known state names)
      const stateAbbreviations = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
      
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part && !stateAbbreviations.includes(part.toUpperCase()) && part.length > 2) {
          return part;
        }
      }
      
      // Fallback to second-to-last part if available
      if (parts.length >= 3) {
        return parts[parts.length - 3] || parts[1] || 'City';
      }
    }
    
    return 'City';
  };

  const getStateFromPlace = (place: PlaceResult): string => {
    const stateComponent = place.address_components.find(component =>
      component.types.includes('administrative_area_level_1') ||
      component.types.includes('state') ||
      component.types.includes('province')
    );
    
    // If no state found, try to extract from formatted address
    if (!stateComponent && place.formatted_address) {
      const parts = place.formatted_address.split(',');
      if (parts.length >= 2) {
        const statePart = parts[parts.length - 2]?.trim();
        if (statePart && statePart.length <= 4) { // Likely a state abbreviation
          return statePart;
        }
      }
    }
    
    return stateComponent?.short_name || stateComponent?.long_name || 'State';
  };

  // Close suggestions when clicking outside and cleanup debounce
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup debounce timer on unmount
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${className} ${error ? 'border-red-500' : selectedPlace ? 'border-green-500' : ''}`}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {selectedPlace && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((place) => (
            <div
              key={place.place_id}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelectPlace(place)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {place.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {place.formatted_address}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {getCityFromPlace(place)}, {getStateFromPlace(place)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPlace && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Address Verified</span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            <strong>{getCityFromPlace(selectedPlace)}, {getStateFromPlace(selectedPlace)}</strong>
          </div>
          <div className="text-xs text-green-600 mt-1">
            Location confirmed via OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
