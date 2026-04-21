/**
 * CoffeeOS - Customer Search Component
 * Búsqueda de clientes por teléfono con display de puntos de lealtad
 */

'use client';

import { useState } from 'react';
import { Search, User, Gift, X, Phone, Mail, Award } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  segment: 'vip' | 'frequent' | 'regular' | 'new';
  totalPurchases: number;
  lastVisit: string;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export default function CustomerSearch({
  onCustomerSelect,
  selectedCustomer,
}: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock customers data (en producción, esto vendría del API)
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.length >= 3) {
      setIsSearching(true);

      // TODO: Implementar API call para búsqueda de clientes
      setTimeout(() => {
        setSearchResults([]);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearCustomer = () => {
    onCustomerSelect(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getSegmentBadge = (segment: string) => {
    switch (segment) {
      case 'vip':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'frequent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'regular':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'new':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSegmentLabel = (segment: string) => {
    const labels: Record<string, string> = {
      vip: 'VIP',
      frequent: 'Frecuente',
      regular: 'Regular',
      new: 'Nuevo',
    };
    return labels[segment] || segment;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {/* Customer Selected Card */}
      {selectedCustomer ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Cliente Registrado
            </h3>
            <button
              onClick={handleClearCustomer}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {selectedCustomer.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Phone className="w-3 h-3" />
                    {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getSegmentBadge(selectedCustomer.segment)}`}
              >
                {getSegmentLabel(selectedCustomer.segment)}
              </span>
            </div>

            {/* Loyalty Points Display */}
            <div className="bg-white/80 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Programa 9+1
                </span>
                <Gift className="w-5 h-5 text-purple-600" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(selectedCustomer.loyaltyPoints / 9) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {selectedCustomer.loyaltyPoints}/9
                </span>
              </div>

              {selectedCustomer.loyaltyPoints >= 9 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded px-2 py-1">
                  <Award className="w-4 h-4" />
                  <span className="font-semibold">
                    ¡Bebida GRATIS disponible!
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  Faltan {9 - selectedCustomer.loyaltyPoints} compras para
                  bebida gratis
                </p>
              )}
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-white/60 rounded px-2 py-1">
                <p className="text-xs text-gray-600">Total Compras</p>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedCustomer.totalPurchases}
                </p>
              </div>
              <div className="bg-white/60 rounded px-2 py-1">
                <p className="text-xs text-gray-600">Última Visita</p>
                <p className="text-sm font-semibold text-gray-800">
                  {new Date(selectedCustomer.lastVisit).toLocaleDateString(
                    'es-MX',
                    {
                      day: '2-digit',
                      month: 'short',
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Search Box */
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Buscar Cliente (opcional)
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por teléfono o nombre..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {customer.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-purple-600 font-semibold">
                        <Gift className="w-4 h-4" />
                        {customer.loyaltyPoints}/9
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs border ${getSegmentBadge(customer.segment)}`}
                      >
                        {getSegmentLabel(customer.segment)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.length >= 3 &&
            searchResults.length === 0 &&
            !isSearching && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
                No se encontraron clientes. ¿Deseas registrar uno nuevo?
              </div>
            )}

          {/* Quick Register Button */}
          <button className="w-full mt-3 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors">
            <User className="w-4 h-4 inline mr-2" />
            Registrar nuevo cliente
          </button>
        </div>
      )}
    </div>
  );
}
