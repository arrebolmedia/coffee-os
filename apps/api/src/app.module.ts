import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

// Health check
import { HealthModule } from './health/health.module';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

// Business modules
import { PosModule } from './modules/pos/pos.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ModifiersModule } from './modules/modifiers/modifiers.module';
import { InventoryItemsModule } from './modules/inventory-items/inventory-items.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RolesModule } from './modules/roles/roles.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InventoryMovementsModule } from './modules/inventory-movements/inventory-movements.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { QualityModule } from './modules/quality/quality.module';
import { CrmModule } from './modules/crm/crm.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Integration modules
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { TwilioModule } from './modules/integrations/twilio/twilio.module';
import { MailrelayModule } from './modules/integrations/mailrelay/mailrelay.module';
import { CfdiModule } from './modules/integrations/cfdi/cfdi.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';

// Infrastructure modules
import { DatabaseModule } from './modules/database/database.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // GraphQL
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      context: ({ req }) => ({ req }),
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,

    // Health check
    HealthModule,

    // Core modules
    AuthModule,
    UsersModule,
    OrganizationsModule,

    // Business modules
    PosModule,
    ProductsModule,
    CategoriesModule,
    ModifiersModule,
    InventoryItemsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    LocationsModule,
    RolesModule,
    InventoryModule,
    InventoryMovementsModule,
    RecipesModule,
    TransactionsModule,
    PaymentsModule,
    OrdersModule,
    DiscountsModule,
    TaxesModule,
    ShiftsModule,
    CashRegistersModule,
    QualityModule,
    CrmModule,
    FinanceModule,
    HrModule,
    AnalyticsModule,

    // Integration modules
    IntegrationsModule,
    TwilioModule,
    MailrelayModule,
    CfdiModule,
    NotificationsModule,
    SettingsModule,
  ],
})
export class AppModule {}
