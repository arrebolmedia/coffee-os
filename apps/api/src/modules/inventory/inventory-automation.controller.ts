import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { InventoryAutomationService } from './inventory-automation.service';
import { TheoreticalStockService } from './theoretical-stock.service';
import { StockReconciliationService } from './stock-reconciliation.service';
import { RecipeInventoryLinksService } from './recipe-inventory-links.service';

/**
 * Recipe-driven inventory automation.
 *
 * Every endpoint here is backed by Prisma. The organization is always taken
 * from the JWT via `@CurrentOrg()`; `:organizationId` path params are kept for
 * backwards compatibility with the POS client and are additionally validated
 * by the global `TenantGuard`.
 */
@ApiTags('inventory-automation')
@Controller('inventory/automation')
export class InventoryAutomationController {
  constructor(
    private readonly automation: InventoryAutomationService,
    private readonly theoreticalStock: TheoreticalStockService,
    private readonly reconciliation: StockReconciliationService,
    private readonly links: RecipeInventoryLinksService,
  ) {}

  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  // ==========================================================================
  // THEORETICAL STOCK
  // ==========================================================================

  @Get('theoretical-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Theoretical stock vs recorded stock, per item' })
  async getOrganizationTheoreticalStock(
    @CurrentOrg() organizationId: string,
    @Query('show_discrepancies_only') showDiscrepanciesOnly?: string,
    @Query('min_discrepancy_percentage') minDiscrepancyPercentage?: string,
    @Query('start_date') startDate?: string,
  ) {
    const rows = await this.theoreticalStock.forOrganization(organizationId, {
      startDate: this.parseDate(startDate),
    });

    const minPercentage = Number(minDiscrepancyPercentage);
    return rows.filter((row) => {
      if (
        showDiscrepanciesOnly === 'true' &&
        Math.abs(row.discrepancy) <= 1e-6
      ) {
        return false;
      }
      if (
        Number.isFinite(minPercentage) &&
        minDiscrepancyPercentage !== undefined &&
        Math.abs(row.discrepancy_percentage) < minPercentage
      ) {
        return false;
      }
      return true;
    });
  }

  @Get('theoretical-stock/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Theoretical stock for a single inventory item' })
  async getTheoreticalStock(
    @Param('id') inventoryItemId: string,
    @CurrentOrg() organizationId: string,
    @Query('start_date') startDate?: string,
  ) {
    return this.theoreticalStock.forItem(
      inventoryItemId,
      organizationId,
      this.parseDate(startDate),
    );
  }

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  @Post('reconciliation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a physical count and adjust stock' })
  async createReconciliation(
    @Body() data: any,
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.reconciliation.createReconciliation(organizationId, {
      inventory_item_id: data?.inventory_item_id,
      physical_count: data?.physical_count,
      reason: data?.reason,
      notes: data?.notes,
      performed_by: data?.performed_by ?? user?.userId,
    });
  }

  @Get('reconciliation/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconciliation history for an inventory item' })
  async getReconciliationHistory(
    @Param('id') inventoryItemId: string,
    @CurrentOrg() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reconciliation.getReconciliationHistory(
      inventoryItemId,
      organizationId,
      Number(limit) || 10,
    );
  }

  @Post('reconciliation/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record physical counts for several items' })
  async bulkReconciliation(
    @Body() data: any,
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.reconciliation.bulkReconciliation(organizationId, {
      items: data?.items,
      performed_by: data?.performed_by ?? user?.userId,
      reason: data?.reason,
    });
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  @Get('config/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get auto-deduction configuration' })
  async getAutoDeductConfig(@CurrentOrg() organizationId: string) {
    return this.automation.getConfig(organizationId);
  }

  @Put('config/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update auto-deduction configuration' })
  async updateAutoDeductConfig(
    @Body() config: any,
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.automation.updateConfig(organizationId, config, user?.userId);
  }

  // ==========================================================================
  // STOCK DEDUCTION
  // ==========================================================================

  @Post('deduct/order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deduct recipe ingredients for an order' })
  async deductStockForOrder(
    @Param('orderId') orderId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.automation.deductForOrder(orderId, organizationId);
  }

  @Get('deduct/order/:orderId/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview a deduction without writing anything' })
  async previewStockDeduction(
    @Param('orderId') orderId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.automation.previewDeduction(orderId, organizationId);
  }

  @Post('deduct/order/:orderId/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a previous deduction' })
  async reverseStockDeduction(
    @Param('orderId') orderId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.automation.reverseDeduction(orderId, organizationId);
  }

  @Get('deduction-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stock deduction log (inventory_movements)' })
  async getStockDeductionLogs(
    @Query() filters: any,
    @CurrentOrg() organizationId: string,
  ) {
    return this.automation.getDeductionLogs(organizationId, filters ?? {});
  }

  // ==========================================================================
  // RECIPE <-> INVENTORY LINKS
  // ==========================================================================

  @Get('recipes/:recipeId/links')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inventory items linked to a recipe' })
  async getRecipeIngredientLinks(
    @Param('recipeId') recipeId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.links.getRecipeLinks(recipeId, organizationId);
  }

  @Post('links')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link an inventory item to a recipe' })
  async linkRecipeIngredient(
    @Body() data: any,
    @CurrentOrg() organizationId: string,
  ) {
    return this.links.createLink(organizationId, data ?? {});
  }

  @Put('links/:linkId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a recipe-inventory link' })
  async updateRecipeIngredientLink(
    @Param('linkId') linkId: string,
    @Body() data: any,
    @CurrentOrg() organizationId: string,
  ) {
    return this.links.updateLink(linkId, organizationId, data ?? {});
  }

  @Delete('links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recipe-inventory link' })
  async deleteRecipeIngredientLink(
    @Param('linkId') linkId: string,
    @CurrentOrg() organizationId: string,
  ) {
    await this.links.deleteLink(linkId, organizationId);
  }

  /**
   * Not implemented on purpose: in this schema a recipe ingredient IS the link
   * (`recipe_ingredients.inventory_item_id` is a required FK), so there are no
   * unlinked ingredients left to match. Returning a fabricated
   * `{ linked: n }` here is exactly the kind of lie this controller used to
   * tell. Use POST /inventory/automation/links to create a link explicitly.
   */
  @Post('recipes/:recipeId/auto-link')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Auto-link recipe ingredients (not implemented)' })
  async autoLinkRecipeIngredients(@Param('recipeId') _recipeId: string) {
    throw new NotImplementedException(
      'Auto-linking is not available: recipe ingredients already reference an inventory item by construction. Create links explicitly with POST /inventory/automation/links.',
    );
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  @Get('reports/accuracy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inventory accuracy report' })
  async getInventoryAccuracyReport(
    @CurrentOrg() organizationId: string,
    @Query('start_date') startDate?: string,
  ) {
    return this.theoreticalStock.accuracyReport(
      organizationId,
      this.parseDate(startDate),
    );
  }

  @Get('reports/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recipe-implied ingredient usage report' })
  async getIngredientUsageReport(
    @CurrentOrg() organizationId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const start =
      this.parseDate(startDate) ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.theoreticalStock.usageReport(
      organizationId,
      start,
      this.parseDate(endDate),
    );
  }
}
