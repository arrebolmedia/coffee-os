import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs/promises';

@ApiTags('uploads')
@Controller('uploads')
@Public() // Los uploads son públicos para que puedan mostrarse en el frontend
export class UploadsController {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  @Get('products/:filename')
  @ApiOperation({ summary: 'Get product image' })
  @ApiParam({ name: 'filename', description: 'Image filename' })
  @ApiResponse({ status: 200, description: 'Image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getProductImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(this.uploadDir, 'products', filename);

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (error) {
      throw new NotFoundException('Image not found');
    }
  }

  @Get('categories/:filename')
  @ApiOperation({ summary: 'Get category image' })
  @ApiParam({ name: 'filename', description: 'Image filename' })
  @ApiResponse({ status: 200, description: 'Image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getCategoryImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(this.uploadDir, 'categories', filename);

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (error) {
      throw new NotFoundException('Image not found');
    }
  }
}
