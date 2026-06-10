import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs/promises';

// Only allow safe filename characters. Reject anything else outright
// (no slashes, no "..", no NUL bytes, no spaces).
const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;

@ApiTags('uploads')
@Controller('uploads')
@Public() // Los uploads son públicos para que puedan mostrarse en el frontend
export class UploadsController {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  @Get('products/:filename')
  @ApiOperation({ summary: 'Get product image' })
  @ApiParam({ name: 'filename', description: 'Image filename' })
  @ApiResponse({ status: 200, description: 'Image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getProductImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.resolveSafePath('products', filename);
    await this.sendIfExists(filePath, res);
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
    const filePath = this.resolveSafePath('categories', filename);
    await this.sendIfExists(filePath, res);
  }

  /**
   * Resolve a filename inside a known subdirectory of uploadDir, refusing
   * anything that could escape uploadDir via path traversal.
   */
  private resolveSafePath(
    subdir: 'products' | 'categories',
    filename: string,
  ): string {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename');
    }

    // Strip any directory components defensively (e.g. "../evil.png" → "evil.png").
    const baseName = path.basename(filename);

    if (!SAFE_FILENAME_RE.test(baseName)) {
      throw new BadRequestException('Invalid filename');
    }

    const subdirAbs = path.resolve(this.uploadDir, subdir);
    const filePath = path.resolve(subdirAbs, baseName);

    // Confirm the resolved path still lives inside the expected subdir.
    const subdirWithSep = subdirAbs.endsWith(path.sep)
      ? subdirAbs
      : subdirAbs + path.sep;
    if (!filePath.startsWith(subdirWithSep)) {
      throw new BadRequestException('Invalid filename');
    }

    return filePath;
  }

  private async sendIfExists(filePath: string, res: Response): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('Image not found');
    }
    res.sendFile(filePath);
  }
}
