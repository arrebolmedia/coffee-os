/**
 * CoffeeOS - Location Selector Component
 * Selector de sucursal para multi-tenancy
 */

'use client';

import { useState } from 'react';
import { MapPin, Check, ChevronDown } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

interface LocationSelectorProps {
  currentLocation?: Location;
  locations?: Location[];
  onLocationChange?: (locationId: string) => void;
}

export default function LocationSelector({
  currentLocation,
  locations = [],
  onLocationChange,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Mock locations (en producción vendrían del API)
  const availableLocations = locations;
  const selectedLocation = currentLocation || availableLocations[0];

  const handleSelectLocation = (locationId: string) => {
    if (onLocationChange) {
      onLocationChange(locationId);
    }
    setIsOpen(false);
  };

  // Si no hay ubicaciones disponibles, no renderizar el componente
  if (
    !availableLocations ||
    availableLocations.length === 0 ||
    !selectedLocation
  ) {
    return null;
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <MapPin className="w-4 h-4 text-blue-600" />
        <div className="text-left hidden md:block">
          <div className="text-sm font-medium text-gray-900">
            {selectedLocation.name}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[150px]">
            {selectedLocation.address.split(',')[0]}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[400px] overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Seleccionar Sucursal
              </div>

              {availableLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelectLocation(location.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-colors ${
                    selectedLocation.id === location.id
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <MapPin
                    className={`w-5 h-5 mt-0.5 ${
                      selectedLocation.id === location.id
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />

                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-medium ${
                          selectedLocation.id === location.id
                            ? 'text-blue-900'
                            : 'text-gray-900'
                        }`}
                      >
                        {location.name}
                      </span>
                      {selectedLocation.id === location.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{location.address}</p>
                    {location.isActive && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Activa
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to locations management
                  window.location.href = '/settings/locations';
                }}
                className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center font-medium"
              >
                + Administrar Sucursales
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
