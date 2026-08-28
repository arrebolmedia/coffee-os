'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useCreateChecklist } from '@/hooks/use-quality-control';
import { useAuth } from '@/hooks/use-auth';

/**
 * Crear un checklist de apertura, cierre o limpieza.
 *
 * La pantalla de calidad los listaba y no había forma de crear uno:
 * `useCreateChecklist` existía y no lo llamaba nadie. Sin esto, la lista de
 * verificación de apertura —lo que la NOM-251 llama control de buenas
 * prácticas— sólo se podía dar de alta por API.
 *
 * Viene con plantillas de arranque para que el encargado no teclee las mismas
 * ocho líneas cada mañana. Son un punto de partida, no una obligación: cada
 * línea se puede quitar, cambiar o añadir.
 */

/** Puntos habituales de una cafetería, para no partir de una hoja en blanco. */
const PLANTILLAS = {
  apertura: {
    nombre: 'Apertura',
    tipo: 'DAILY',
    puntos: [
      ['Temperatura de refrigeradores dentro de rango', 'TEMPERATURE'],
      ['Superficies de trabajo limpias y desinfectadas', 'CLEANING'],
      ['Máquina de espresso purgada y a presión', 'EQUIPMENT'],
      ['Personal con uniforme limpio y manos lavadas', 'PERSONNEL'],
      ['Producto del día sin caducar', 'FOOD_SAFETY'],
      ['Fondo de caja contado', 'PERSONNEL'],
    ],
  },
  cierre: {
    nombre: 'Cierre',
    tipo: 'DAILY',
    puntos: [
      ['Máquina de espresso lavada con detergente', 'EQUIPMENT'],
      ['Molinos vaciados y limpios', 'EQUIPMENT'],
      ['Refrigeradores cerrados y a temperatura', 'TEMPERATURE'],
      ['Superficies y piso limpios', 'CLEANING'],
      ['Basura sacada y contenedores lavados', 'WASTE'],
      ['Producto perecedero rotulado y guardado', 'STORAGE'],
    ],
  },
  limpieza: {
    nombre: 'Limpieza profunda',
    tipo: 'WEEKLY',
    puntos: [
      ['Descalcificación de la máquina', 'EQUIPMENT'],
      ['Limpieza de campana y filtros', 'CLEANING'],
      ['Cámara de refrigeración vaciada y lavada', 'STORAGE'],
    ],
  },
} as const;

const CATEGORIAS = [
  ['CLEANING', 'Limpieza'],
  ['FOOD_SAFETY', 'Inocuidad'],
  ['EQUIPMENT', 'Equipo'],
  ['PERSONNEL', 'Personal'],
  ['HYGIENE', 'Higiene'],
  ['TEMPERATURE', 'Temperatura'],
  ['STORAGE', 'Almacenamiento'],
  ['WASTE', 'Residuos'],
] as const;

interface Punto {
  description: string;
  category: string;
}

interface Props {
  abierto: boolean;
  onClose: () => void;
}

export function ChecklistModal({ abierto, onClose }: Props) {
  const { user } = useAuth();
  const crear = useCreateChecklist();

  const [plantilla, setPlantilla] =
    useState<keyof typeof PLANTILLAS>('apertura');
  const [nombre, setNombre] = useState<string>(PLANTILLAS.apertura.nombre);
  const [puntos, setPuntos] = useState<Punto[]>(
    PLANTILLAS.apertura.puntos.map(([description, category]) => ({
      description,
      category,
    })),
  );
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const etiqueta = 'mb-1 block text-sm font-medium text-gray-700';

  const cambiarPlantilla = (clave: keyof typeof PLANTILLAS) => {
    setPlantilla(clave);
    setNombre(PLANTILLAS[clave].nombre);
    setPuntos(
      PLANTILLAS[clave].puntos.map(([description, category]) => ({
        description,
        category,
      })),
    );
  };

  const guardar = async () => {
    setError(null);
    if (!nombre.trim()) return setError('Ponle un nombre al checklist.');
    const utiles = puntos.filter((p) => p.description.trim());
    if (!utiles.length)
      return setError('Un checklist sin ningún punto no verifica nada.');
    if (!user?.locationId)
      return setError('El usuario no tiene una sucursal asignada.');

    try {
      await crear.mutateAsync({
        name: nombre.trim(),
        type: PLANTILLAS[plantilla].tipo as never,
        location_id: user.locationId,
        items: utiles.map((p) => ({
          description: p.description.trim(),
          category: p.category as never,
        })),
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo crear el checklist.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-checklist"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="titulo-checklist"
            className="text-lg font-semibold text-gray-900"
          >
            Nuevo checklist
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={etiqueta} htmlFor="ck-plantilla">
                Punto de partida
              </label>
              <select
                id="ck-plantilla"
                className={campo}
                value={plantilla}
                onChange={(e) =>
                  cambiarPlantilla(e.target.value as keyof typeof PLANTILLAS)
                }
              >
                <option value="apertura">Apertura (diario)</option>
                <option value="cierre">Cierre (diario)</option>
                <option value="limpieza">Limpieza profunda (semanal)</option>
              </select>
            </div>

            <div>
              <label className={etiqueta} htmlFor="ck-nombre">
                Nombre
              </label>
              <input
                id="ck-nombre"
                className={campo}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Puntos a verificar
            </p>
            <div className="space-y-2">
              {puntos.map((punto, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    aria-label={`Punto ${i + 1}`}
                    className={campo}
                    value={punto.description}
                    onChange={(e) =>
                      setPuntos(
                        puntos.map((p, j) =>
                          j === i ? { ...p, description: e.target.value } : p,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label={`Categoría del punto ${i + 1}`}
                    className="w-44 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    value={punto.category}
                    onChange={(e) =>
                      setPuntos(
                        puntos.map((p, j) =>
                          j === i ? { ...p, category: e.target.value } : p,
                        ),
                      )
                    }
                  >
                    {CATEGORIAS.map(([valor, texto]) => (
                      <option key={valor} value={valor}>
                        {texto}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPuntos(puntos.filter((_, j) => j !== i))}
                    aria-label={`Quitar el punto ${i + 1}`}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setPuntos([
                  ...puntos,
                  { description: '', category: 'CLEANING' },
                ])
              }
              className="mt-3 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Añadir punto
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={crear.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {crear.isPending ? 'Creando…' : 'Crear checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
