/**
 * CoffeeOS POS Web - Recipe Ingredient Linking Modal
 * Modal para vincular ingredientes de receta con items de inventario
 */

'use client';

import { useState, useMemo } from 'react';
import {
  useRecipeIngredientLinks,
  useLinkRecipeIngredient,
  useDeleteRecipeIngredientLink,
  useAutoLinkRecipeIngredients,
} from '@/hooks/use-inventory-automation';
import { useRecipe, useRecipeIngredients } from '@/hooks/use-recipes';
import { useInventory } from '@/hooks/use-inventory';
import {
  X,
  Link as LinkIcon,
  Unlink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  Package,
  TrendingUp,
  Search,
} from 'lucide-react';

interface RecipeIngredientLinkingModalProps {
  recipeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeIngredientLinkingModal({
  recipeId,
  isOpen,
  onClose,
}: RecipeIngredientLinkingModalProps) {
  const [selectedIngredientId, setSelectedIngredientId] = useState<
    string | null
  >(null);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [autoDeduct, setAutoDeduct] = useState(true);
  const [searchInventory, setSearchInventory] = useState('');

  // Fetch data
  const { data: recipe } = useRecipe(recipeId, isOpen);
  const { data: ingredients } = useRecipeIngredients(recipeId, isOpen);
  const { data: links } = useRecipeIngredientLinks(recipeId, isOpen);
  const { data: inventoryItems } = useInventory();

  // Mutations
  const linkMutation = useLinkRecipeIngredient();
  const deleteMutation = useDeleteRecipeIngredientLink();
  const autoLinkMutation = useAutoLinkRecipeIngredients();

  // Filter inventory items by search
  const filteredInventoryItems = useMemo(() => {
    if (!inventoryItems) return [];

    if (!searchInventory.trim()) return inventoryItems;

    const query = searchInventory.toLowerCase();
    return inventoryItems.filter(
      (item: any) =>
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query),
    );
  }, [inventoryItems, searchInventory]);

  // Check if ingredient is already linked
  const getIngredientLink = (ingredientId: string) => {
    return links?.find((link) => link.recipe_ingredient_id === ingredientId);
  };

  const handleLink = async () => {
    if (!selectedIngredientId || !selectedInventoryItemId) return;

    const ingredient = ingredients?.find(
      (ing) => ing.id === selectedIngredientId,
    );
    const inventoryItem = inventoryItems?.find(
      (item: any) => item.id === selectedInventoryItemId,
    );

    if (!ingredient || !inventoryItem) return;

    await linkMutation.mutateAsync({
      recipe_id: recipeId,
      recipe_ingredient_id: selectedIngredientId,
      inventory_item_id: selectedInventoryItemId,
      conversion_factor: parseFloat(conversionFactor) || 1,
      unit_mapping: {
        recipe_unit: ingredient.unit,
        inventory_unit: (inventoryItem as any).unit || 'unit',
      },
      auto_deduct: autoDeduct,
    });

    // Reset form
    setSelectedIngredientId(null);
    setSelectedInventoryItemId('');
    setConversionFactor('1');
    setAutoDeduct(true);
  };

  const handleAutoLink = async () => {
    await autoLinkMutation.mutateAsync(recipeId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Vincular Ingredientes con Inventario
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {recipe?.name || 'Cargando receta...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Ingredients List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Ingredientes de la Receta
                </h3>
                <button
                  onClick={handleAutoLink}
                  disabled={autoLinkMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {autoLinkMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Auto-vincular
                </button>
              </div>

              {!ingredients || ingredients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay ingredientes en esta receta</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ingredients.map((ingredient) => {
                    const link = getIngredientLink(ingredient.id);
                    const isLinked = !!link;
                    const inventoryItem = inventoryItems?.find(
                      (item: any) => item.id === link?.inventory_item_id,
                    );

                    return (
                      <div
                        key={ingredient.id}
                        className={`border rounded-lg p-4 transition-all ${
                          selectedIngredientId === ingredient.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : isLinked
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              {ingredient.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {ingredient.quantity} {ingredient.unit}
                              {ingredient.unit_cost && (
                                <span className="ml-2 text-gray-500">
                                  (${ingredient.unit_cost.toFixed(2)}/
                                  {ingredient.unit})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLinked ? (
                              <>
                                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  Vinculado
                                </span>
                                <button
                                  onClick={() =>
                                    link && deleteMutation.mutate(link.id)
                                  }
                                  className="text-red-600 hover:text-red-800"
                                  title="Desvincular"
                                >
                                  <Unlink className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setSelectedIngredientId(ingredient.id)
                                }
                                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  selectedIngredientId === ingredient.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <LinkIcon className="w-3 h-3" />
                                Vincular
                              </button>
                            )}
                          </div>
                        </div>

                        {isLinked && inventoryItem && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">
                                {(inventoryItem as any).name}
                              </span>
                              <span className="text-gray-500">
                                (Factor: {link.conversion_factor}x)
                              </span>
                            </div>
                            {link.auto_deduct && (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                Descuento automático
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Linking Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Vincular Ingrediente
              </h3>

              {selectedIngredientId ? (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  {/* Selected Ingredient Info */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Ingrediente seleccionado:
                    </p>
                    <p className="font-semibold text-gray-900">
                      {
                        ingredients?.find(
                          (ing) => ing.id === selectedIngredientId,
                        )?.name
                      }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {
                        ingredients?.find(
                          (ing) => ing.id === selectedIngredientId,
                        )?.quantity
                      }{' '}
                      {
                        ingredients?.find(
                          (ing) => ing.id === selectedIngredientId,
                        )?.unit
                      }
                    </p>
                  </div>

                  {/* Inventory Item Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item de Inventario
                    </label>
                    <div className="mb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar en inventario..."
                          value={searchInventory}
                          onChange={(e) => setSearchInventory(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <select
                      value={selectedInventoryItemId}
                      onChange={(e) =>
                        setSelectedInventoryItemId(e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-48 overflow-y-auto"
                    >
                      <option value="">Seleccionar item...</option>
                      {filteredInventoryItems.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.current_stock} {item.unit}{' '}
                          disponible)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Conversion Factor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Factor de Conversión
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="1.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1 unidad de receta = {conversionFactor || '?'} unidades de
                      inventario
                    </p>
                  </div>

                  {/* Auto Deduct Toggle */}
                  <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                    <div>
                      <label className="font-medium text-gray-700">
                        Descuento Automático
                      </label>
                      <p className="text-xs text-gray-500">
                        Descontar stock al cerrar pedido
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoDeduct(!autoDeduct)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoDeduct ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoDeduct ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleLink}
                    disabled={
                      !selectedInventoryItemId || linkMutation.isPending
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {linkMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Vinculando...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-5 h-5" />
                        Vincular Ingrediente
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <LinkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Selecciona un ingrediente de la izquierda para vincularlo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {links?.length || 0} de {ingredients?.length || 0} ingredientes
            vinculados
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
