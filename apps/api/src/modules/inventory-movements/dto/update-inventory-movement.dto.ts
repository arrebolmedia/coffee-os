import { PartialType } from '@nestjs/swagger';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto';

export class UpdateInventoryMovementDto extends PartialType(
  CreateInventoryMovementDto,
) {}
