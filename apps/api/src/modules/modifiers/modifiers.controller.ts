import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { QueryModifiersDto } from './dto/query-modifiers.dto';

@Controller('modifiers')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createModifierDto: CreateModifierDto) {
    return this.modifiersService.create(createModifierDto);
  }

  @Get()
  async findAll(@Query() query: QueryModifiersDto) {
    return this.modifiersService.findAll(query);
  }

  @Get('active')
  async findAllActive() {
    return this.modifiersService.findAllActive();
  }

  @Get('type/:type')
  async findByType(@Param('type') type: string) {
    return this.modifiersService.findByType(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.modifiersService.findOne(id);
  }

  @Get(':id/products')
  async findProducts(@Param('id') id: string) {
    return this.modifiersService.findModifierProducts(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateModifierDto: UpdateModifierDto,
  ) {
    return this.modifiersService.update(id, updateModifierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.modifiersService.remove(id);
  }
}
