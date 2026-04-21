'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { MoreVertical, Edit, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { Product } from '@/types';

interface ProductActionsMenuProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}

export default function ProductActionsMenu({
  product,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: ProductActionsMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="rounded-lg p-1 hover:bg-gray-100">
        <MoreVertical className="h-5 w-5 text-gray-500" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onEdit}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex w-full items-center gap-2 px-4 py-2 text-sm`}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onDuplicate}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex w-full items-center gap-2 px-4 py-2 text-sm`}
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onToggleStatus}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex w-full items-center gap-2 px-4 py-2 text-sm`}
                >
                  {product.status === 'ACTIVE' ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Activar
                    </>
                  )}
                </button>
              )}
            </Menu.Item>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onDelete}
                  className={`${
                    active ? 'bg-red-50 text-red-900' : 'text-red-700'
                  } group flex w-full items-center gap-2 px-4 py-2 text-sm`}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
