/**
 * CategoryModal - Create/Edit inventory categories
 */

'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { InputField, SelectField } from '@/components/ui/FormField';
import { Save } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryName: string) => Promise<void>;
  isLoading?: boolean;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: CategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setCategoryName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }

    if (categoryName.length > 100) {
      setError('El nombre debe tener máximo 100 caracteres');
      return;
    }

    try {
      await onSave(categoryName.trim());
      onClose();
    } catch (err) {
      setError('Error al crear categoría');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Categoría de Inventario"
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <InputField
          label="Nombre de Categoría"
          placeholder="Ej: Café en Grano, Lácteos, Jarabes..."
          value={categoryName}
          onChange={(e) => {
            setCategoryName(e.target.value);
            setError('');
          }}
          error={error}
          required
          autoFocus
          helperText="Esta categoría se usará para organizar tu inventario"
        />

        <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Crear
          </Button>
        </div>
      </form>
    </Modal>
  );
}
