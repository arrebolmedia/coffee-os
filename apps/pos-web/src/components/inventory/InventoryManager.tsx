/**
 * InventoryManager - Complete CRUD functionality for inventory
 */

'use client';

import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import {
  type InventoryItem,
  InventoryItemModal,
} from '@/components/inventory/InventoryItemModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
} from '@/hooks/use-inventory';

interface InventoryManagerProps {
  items: InventoryItem[];
  organizationId: string;
}

export function InventoryManager({
  items: _items,
  organizationId,
}: InventoryManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const handleCreate = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (item: InventoryItem) => {
    try {
      if (item.id) {
        await updateMutation.mutateAsync({ id: item.id, data: item });
      } else {
        await createMutation.mutateAsync(item);
      }
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      // Error is handled by mutation
      console.error('Error saving inventory item:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete?.id) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } catch (error) {
        // Error is handled by mutation
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
        >
          Nuevo Producto
        </Button>
      </div>

      {/* Item Actions in Table (to be used in parent component) */}
      {/* This component provides the modals and handlers */}

      {/* Create/Edit Modal */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
        item={selectedItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
        organizationId={organizationId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

// Export action buttons for table rows
export function InventoryItemActions({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => onEdit(item)}
        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
        title="Editar"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(item)}
        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
