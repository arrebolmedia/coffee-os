/**
 * CoffeeOS POS Web - Recipes Page
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCreateRecipe,
  useDeleteRecipe,
  useRecipe,
  useRecipeCategories,
  useRecipes,
  useUpdateRecipe,
} from '@/hooks/use-recipes';
import { useInventory } from '@/hooks/use-inventory';
import { useAuth } from '@/hooks/use-auth';
import { RecipeIngredientLinkingModal } from '@/components/recipes/RecipeIngredientLinkingModal';
import { RecipeFormData, RecipeModal } from '@/components/recipes/RecipeModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { logger } from '@/lib/logger';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Coffee,
  Copy,
  DollarSign,
  Download,
  Edit,
  Eye,
  Link as LinkIcon,
  Loader2,
  Package,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

interface RecipeDisplay {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  estimatedTimeMinutes: number;
  difficulty: 'facil' | 'intermedio' | 'avanzado' | 'experto';
  servings: number;
  totalCost: number;
  ingredientsCount: number;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  experto: 'Experto',
};

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [linkingModalOpen, setLinkingModalOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeFormData | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeDisplay | null>(
    null,
  );
  const [recipeIdToEdit, setRecipeIdToEdit] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: recipesData, isLoading, error, refetch } = useRecipes();
  const { data: categories } = useRecipeCategories();
  const { data: inventoryData } = useInventory();
  const { data: recipeDetails, isLoading: isLoadingRecipeDetails } = useRecipe(
    recipeIdToEdit || '',
    !!recipeIdToEdit,
  );

  // CRUD Mutations
  const createMutation = useCreateRecipe();
  const updateMutation = useUpdateRecipe();
  const deleteMutation = useDeleteRecipe();

  const recipes: RecipeDisplay[] = useMemo(() => {
    if (!recipesData?.data) return [];
    return recipesData.data.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      category: recipe.category || 'Sin categoría',
      isActive: recipe.is_active !== false,
      estimatedTimeMinutes: recipe.estimated_time_minutes || 0,
      difficulty: recipe.difficulty || 'intermedio',
      servings: recipe.servings || 1,
      totalCost: recipe.total_cost || 0,
      ingredientsCount: recipe.ingredients?.length || 0,
    }));
  }, [recipesData]);

  // Prepare inventory items for modal
  const inventoryItems = useMemo(() => {
    if (!inventoryData) return [];
    const items: any[] = Array.isArray(inventoryData)
      ? inventoryData
      : (inventoryData as any).data || [];
    return items.map((item: any) => ({
      id: item.id,
      name: item.name,
      unitOfMeasure: item.unitOfMeasure || item.unit_of_measure || 'unit',
    }));
  }, [inventoryData]);

  // When recipe details are loaded, convert to form format and open modal
  useEffect(() => {
    if (recipeDetails && recipeIdToEdit) {
      const formData: RecipeFormData = {
        id: recipeDetails.id,
        productId: recipeDetails.product_id || '',
        name: recipeDetails.name,
        description: recipeDetails.description || '',
        instructions: recipeDetails.instructions || '',
        category: recipeDetails.category || '',
        prepTime: recipeDetails.estimated_time_minutes || 0,
        yield: recipeDetails.servings || 1,
        yieldUnit: recipeDetails.yield_unit || 'unit',
        allergens: recipeDetails.allergens || [],
        videoUrl: recipeDetails.video_url || '',
        active: recipeDetails.is_active !== false,
        ingredients: (recipeDetails.ingredients || []).map((ing) => ({
          inventoryItemId: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.preparation_notes || '',
        })),
      };
      setSelectedRecipe(formData);
      setIsModalOpen(true);
      setRecipeIdToEdit(null); // Reset after loading
    }
  }, [recipeDetails, recipeIdToEdit]);

  // CRUD Handlers
  const handleSaveRecipe = async (recipeData: RecipeFormData) => {
    try {
      // Convert RecipeFormData to API format (snake_case)
      const apiData: any = {
        product_id: recipeData.productId,
        name: recipeData.name,
        description: recipeData.description,
        instructions: recipeData.instructions,
        category: recipeData.category || 'espresso',
        servings: recipeData.yield,
        estimated_time_minutes: recipeData.prepTime,
        yield_unit: recipeData.yieldUnit,
        allergens: recipeData.allergens,
        video_url: recipeData.videoUrl || undefined,
        is_active: recipeData.active,
        ingredients: recipeData.ingredients.map((ing) => ({
          inventory_item_id: ing.inventoryItemId,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation_notes: ing.notes || undefined,
        })),
      };

      // Add organization_id from current user
      if (user?.organizationId) {
        apiData.organization_id = user.organizationId;
      }

      if (recipeData.id) {
        await updateMutation.mutateAsync({
          id: recipeData.id,
          data: apiData,
        });
      } else {
        await createMutation.mutateAsync(apiData);
      }

      // Invalidate ALL recipe queries to ensure fresh data on next open
      // This will clear both the list and any individual recipe details
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });

      // Force refetch recipes list to show updated data immediately
      await refetch();

      setIsModalOpen(false);
      setSelectedRecipe(null);
    } catch (error) {
      logger.error('Error saving recipe:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteMutation.mutateAsync(recipeToDelete.id);

      setIsDeleteDialogOpen(false);
      setRecipeToDelete(null);
    } catch (error) {
      logger.error('Error deleting recipe:', error);
    }
  };

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((r) => {
        const matchesSearch =
          !searchQuery ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          filterCategory === 'all' || r.category === filterCategory;
        const matchesDifficulty =
          filterDifficulty === 'all' || r.difficulty === filterDifficulty;
        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'active' ? r.isActive : !r.isActive);
        return (
          matchesSearch && matchesCategory && matchesDifficulty && matchesStatus
        );
      }),
    [recipes, searchQuery, filterCategory, filterDifficulty, filterStatus],
  );

  const localStats = useMemo(
    () => ({
      total: recipes.length,
      active: recipes.filter((r) => r.isActive).length,
      facil: recipes.filter((r) => r.difficulty === 'facil').length,
      intermedio: recipes.filter((r) => r.difficulty === 'intermedio').length,
      avanzado: recipes.filter(
        (r) => r.difficulty === 'avanzado' || r.difficulty === 'experto',
      ).length,
      totalCost: recipes.reduce((sum, r) => sum + r.totalCost, 0),
      avgPreparationTime:
        recipes.length > 0
          ? recipes.reduce((sum, r) => sum + r.estimatedTimeMinutes, 0) /
            recipes.length
          : 0,
      totalIngredients: recipes.reduce((sum, r) => sum + r.ingredientsCount, 0),
    }),
    [recipes],
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen text-red-600">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p>Error al cargar recetas</p>
        </div>
      </MainLayout>
    );
  }

  const getStatusBadge = (active: boolean) =>
    active
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-gray-100 text-gray-800 border-gray-300';

  const getDifficultyBadge = (d: string) =>
    ({
      facil: 'bg-green-100 text-green-800',
      intermedio: 'bg-yellow-100 text-yellow-800',
      avanzado: 'bg-orange-100 text-orange-800',
      experto: 'bg-red-100 text-red-800',
    })[d] || 'bg-yellow-100 text-yellow-800';

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                Recetas
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona tus recetas y métodos de preparación
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                onClick={() => {
                  setSelectedRecipe(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nueva Receta
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Recetas</p>
                <p className="text-2xl font-bold">{localStats.total}</p>
                <p className="text-xs text-gray-500">
                  {localStats.active} activas
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-indigo-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Por Dificultad</p>
              <div className="flex gap-3">
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {localStats.facil}
                  </p>
                  <p className="text-xs">Fácil</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">
                    {localStats.intermedio}
                  </p>
                  <p className="text-xs">Intermedio</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {localStats.avanzado}
                  </p>
                  <p className="text-xs">Avanzado</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {localStats.avgPreparationTime.toFixed(0)}m
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Costo Total</p>
                <p className="text-2xl font-bold text-green-600">
                  ${localStats.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {localStats.totalIngredients} ingredientes
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Todas las categorías</option>
              {Array.isArray(categories) &&
                categories.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Todas</option>
              <option value="facil">Fácil</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
              <option value="experto">Experto</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600">
                <div className="flex items-center justify-center h-full">
                  <Coffee className="w-16 h-16 text-white opacity-50" />
                </div>
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(recipe.isActive)}`}
                  >
                    {recipe.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold mb-2">{recipe.name}</h3>
                {recipe.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                <div className="flex gap-4 mb-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {recipe.estimatedTimeMinutes}m
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {recipe.servings}
                  </div>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {recipe.category}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getDifficultyBadge(recipe.difficulty)}`}
                  >
                    {DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}
                  </span>
                </div>
                <div className="flex justify-between mb-4 text-sm">
                  <div>
                    <DollarSign className="w-4 h-4 inline" />$
                    {recipe.totalCost.toFixed(2)}
                  </div>
                  <div>
                    <Package className="w-4 h-4 inline" />
                    {recipe.ingredientsCount} ingr.
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <button className="flex-1 px-3 py-2 text-sm hover:bg-gray-100 rounded">
                    <Eye className="w-4 h-4 inline" /> Ver
                  </button>
                  <button
                    onClick={() => {
                      // Remove cached data for this recipe to force fresh fetch
                      queryClient.removeQueries({
                        queryKey: ['recipes', 'detail', recipe.id],
                      });
                      setRecipeIdToEdit(recipe.id);
                    }}
                    disabled={isLoadingRecipeDetails}
                    className="flex-1 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4 inline" />{' '}
                    {isLoadingRecipeDetails ? 'Cargando...' : 'Editar'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecipeId(recipe.id);
                      setLinkingModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded"
                    title="Vincular con inventario"
                  >
                    <LinkIcon className="w-4 h-4 inline" /> Vincular
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setRecipeToDelete(recipe);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar receta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron recetas</p>
          </div>
        )}

        {filteredRecipes.length > 0 && (
          <div className="mt-6 text-sm text-gray-600 text-center">
            Mostrando {filteredRecipes.length} de {recipes.length} recetas
          </div>
        )}
      </div>

      {/* Recipe Ingredient Linking Modal */}
      {selectedRecipeId && (
        <RecipeIngredientLinkingModal
          recipeId={selectedRecipeId}
          isOpen={linkingModalOpen}
          onClose={() => {
            setLinkingModalOpen(false);
            setSelectedRecipeId(null);
          }}
        />
      )}

      {/* Recipe CRUD Modal */}
      <RecipeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecipe(null);
        }}
        onSave={handleSaveRecipe}
        recipe={selectedRecipe}
        inventoryItems={inventoryItems}
        categories={Array.isArray(categories) ? categories : []}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setRecipeToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Receta"
        message={`¿Estás seguro de que deseas eliminar la receta "${recipeToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </MainLayout>
  );
}
