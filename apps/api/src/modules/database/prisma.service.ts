import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from '../../common/tenancy/prisma-tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    // `$extends` no muta el cliente: devuelve uno nuevo. Devolverlo desde el
    // constructor hace que la instancia que reparte Nest sea la extendida, sin
    // tener que cambiar el token de inyección ni las ~500 llamadas
    // `this.prisma.<modelo>` repartidas por los servicios.
    //
    // La extensión recibe `this` —el cliente SIN extender— para las
    // comprobaciones de pertenencia previas a un update/delete: consultarlas a
    // través del cliente extendido provocaría recursión infinita.
    return this.$extends(
      createTenantExtension(this),
    ) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
