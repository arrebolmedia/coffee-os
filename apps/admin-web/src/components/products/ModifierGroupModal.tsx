'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import type { Modifier, ModifierOption } from '@/types';

const modifierOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  price_adjustment: z.number(),
  is_default: z.boolean(),
});

const modifierGroupSchema = z.object({
  name: z.string().min(1, 'El nombre del grupo es requerido'),
  type: z.enum(['SINGLE', 'MULTIPLE'], {
    required_error: 'Selecciona el tipo de modificador',
  }),
  required: z.boolean(),
  min_selections: z.number().min(0, 'Debe ser mayor o igual a 0'),
  max_selections: z.number().min(1, 'Debe ser mayor a 0'),
  options: z.array(modifierOptionSchema).min(1, 'Agrega al menos una opción'),
});

type ModifierGroupFormData = z.infer<typeof modifierGroupSchema>;

interface ModifierGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup?: Modifier;
}

export default function ModifierGroupModal({
  isOpen,
  onClose,
  modifierGroup,
}: ModifierGroupModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<ModifierGroupFormData>({
    resolver: zodResolver(modifierGroupSchema),
    defaultValues: {
      name: modifierGroup?.name || '',
      type: modifierGroup?.type || 'SINGLE',
      required: modifierGroup?.required ?? false,
      min_selections: modifierGroup?.min_selections || 0,
      max_selections: modifierGroup?.max_selections || 1,
      options: modifierGroup?.options || [
        { name: '', price_adjustment: 0, is_default: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  const watchType = watch('type');

  const mutation = useMutation({
    mutationFn: async (data: ModifierGroupFormData) => {
      if (modifierGroup?.id) {
        return apiClient.put(`/modifiers/${modifierGroup.id}`, data);
      } else {
        return apiClient.post('/modifiers', data);
      }
    },
    onSuccess: () => {
      toast.success(
        modifierGroup
          ? 'Grupo de modificadores actualizado'
          : 'Grupo de modificadores creado',
      );
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Error al guardar el grupo de modificadores',
      );
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: ModifierGroupFormData) => {
    mutation.mutate(data);
  };

  const addOption = () => {
    append({ name: '', price_adjustment: 0, is_default: false });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {modifierGroup ? 'Editar' : 'Nuevo'} Grupo de Modificadores
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre del Grupo *
                      </label>
                      <input
                        type="text"
                        {...register('name')}
                        placeholder="ej: Tamaños, Extras, Leche"
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Type & Required */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Tipo de Selección *
                        </label>
                        <select
                          {...register('type')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="SINGLE">Una opción (radio)</option>
                          <option value="MULTIPLE">
                            Múltiples opciones (checkbox)
                          </option>
                        </select>
                        {errors.type && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.type.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Configuración
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            {...register('required')}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Selección obligatoria
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Min/Max Selections (only for MULTIPLE type) */}
                    {watchType === 'MULTIPLE' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Mínimo de Selecciones
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...register('min_selections', {
                              valueAsNumber: true,
                            })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          {errors.min_selections && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.min_selections.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Máximo de Selecciones
                          </label>
                          <input
                            type="number"
                            min="1"
                            {...register('max_selections', {
                              valueAsNumber: true,
                            })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          {errors.max_selections && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.max_selections.message}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Opciones *
                      </label>
                      <button
                        type="button"
                        onClick={addOption}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Opción
                      </button>
                    </div>

                    {errors.options && (
                      <p className="text-sm text-red-600">
                        {errors.options.message}
                      </p>
                    )}

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          {/* Option Name */}
                          <div className="flex-1">
                            <input
                              type="text"
                              {...register(`options.${index}.name`)}
                              placeholder="Nombre de la opción"
                              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            {errors.options?.[index]?.name && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.options[index]?.name?.message}
                              </p>
                            )}
                          </div>

                          {/* Price Adjustment */}
                          <div className="w-32">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                {...register(
                                  `options.${index}.price_adjustment`,
                                  {
                                    valueAsNumber: true,
                                  },
                                )}
                                placeholder="0.00"
                                className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>

                          {/* Is Default (only for SINGLE type) */}
                          {watchType === 'SINGLE' && (
                            <div className="flex items-center pt-2">
                              <input
                                type="radio"
                                {...register(`options.${index}.is_default`)}
                                className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <label className="ml-1 text-xs text-gray-600">
                                Por defecto
                              </label>
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {mutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {modifierGroup ? 'Actualizar' : 'Crear'} Grupo
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
