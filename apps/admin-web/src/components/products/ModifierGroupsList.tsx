'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import type { Modifier } from '@/types';
import ModifierGroupModal from './ModifierGroupModal';

export default function ModifierGroupsList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Modifier | undefined>();
  const queryClient = useQueryClient();

  // Fetch modifier groups
  const { data: groupsData, isLoading } = useQuery<{ data: Modifier[] }>({
    queryKey: ['modifiers'],
    queryFn: async () => {
      const response = await apiClient.get('/modifiers');
      return response.data;
    },
  });

  const groups = groupsData?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiClient.delete(`/modifiers/${groupId}`);
    },
    onSuccess: () => {
      toast.success('Grupo de modificadores eliminado');
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al eliminar el grupo de modificadores'
      );
    },
  });

  const handleEdit = (group: Modifier) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = async (group: Modifier) => {
    if (
      window.confirm(
        `¿Estás seguro de eliminar el grupo "${group.name}"?\n\nEsto puede afectar a los productos que lo usan.`
      )
    ) {
      deleteMutation.mutate(group.id);
    }
  };

  const handleNew = () => {
    setSelectedGroup(undefined);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Grupos de Modificadores ({groups.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Define opciones personalizables para tus productos
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Grupo
        </button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <Plus className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No hay grupos de modificadores
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Crea grupos para agregar opciones como tamaños, extras o ingredientes.
          </p>
          <button
            onClick={handleNew}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-medium text-gray-900">
                      {group.name}
                    </h4>
                    
                    {/* Type Badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        group.type === 'SINGLE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {group.type === 'SINGLE' ? 'Una opción' : 'Múltiples opciones'}
                    </span>

                    {/* Required Badge */}
                    {group.required && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Obligatorio
                      </span>
                    )}
                  </div>

                  {/* Selections Info */}
                  {group.type === 'MULTIPLE' && (
                    <p className="mt-1 text-sm text-gray-500">
                      Min: {group.min_selections} | Max: {group.max_selections}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Opciones ({group.options.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {option.is_default && group.type === 'SINGLE' && (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        )}
                        <span className="text-sm text-gray-900">{option.name}</span>
                      </div>
                      {option.price_adjustment !== 0 && (
                        <span
                          className={`text-sm font-medium ${
                            option.price_adjustment > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {option.price_adjustment > 0 ? '+' : ''}$
                          {option.price_adjustment.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ModifierGroupModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedGroup(undefined);
        }}
        modifierGroup={selectedGroup}
      />
    </div>
  );
}
