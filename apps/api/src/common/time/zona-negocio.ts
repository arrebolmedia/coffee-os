import { PrismaService } from '../../modules/database/prisma.service';
import { ZONA_POR_DEFECTO, zonaOPorDefecto } from './day-range';

/**
 * De donde sale la zona horaria con la que se recorta el dia.
 *
 * Se separa de `day-range.ts` para que aquel siga siendo logica pura y
 * comprobable sin base de datos. Aqui solo esta la busqueda.
 *
 * La sucursal manda sobre la organizacion: una cadena con local en Tijuana y
 * otro en Ciudad de Mexico cierra la caja a horas distintas en cada uno.
 */
export async function zonaDelNegocio(
  prisma: PrismaService,
  params: { organizationId?: string | null; locationId?: string | null },
): Promise<string> {
  try {
    if (params.locationId) {
      const sucursal = await prisma.location.findUnique({
        where: { id: params.locationId },
        select: { timezone: true },
      });
      if (sucursal?.timezone) return zonaOPorDefecto(sucursal.timezone);
    }

    if (params.organizationId) {
      const organizacion = await prisma.organization.findUnique({
        where: { id: params.organizationId },
        select: { timezone: true },
      });
      if (organizacion?.timezone) return zonaOPorDefecto(organizacion.timezone);
    }
  } catch {
    // Un fallo al leer la zona no puede dejar sin corte de caja a la cafeteria:
    // un informe recortado en la zona por defecto es mucho mejor que un 500.
    // Es el mismo criterio que con una zona mal escrita en la base.
  }

  return ZONA_POR_DEFECTO;
}
