import { PartialType } from '@nestjs/mapped-types';
import { CreateWasteLogDto } from './create-waste-log.dto';

export class UpdateWasteLogDto extends PartialType(CreateWasteLogDto) {}
