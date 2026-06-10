import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFileInfo {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly thumbnailSizes = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 800, height: 800 },
  };

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'products');
    this.baseUrl =
      this.configService.get<string>('API_URL') || 'http://localhost:4000';

    // Crear directorio de uploads si no existe
    this.ensureUploadDirExists();
  }

  /**
   * Asegurar que el directorio de uploads existe
   */
  private async ensureUploadDirExists() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Validar archivo subido
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Subir imagen de producto
   */
  async uploadProductImage(
    file: Express.Multer.File,
  ): Promise<UploadedFileInfo> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      // Optimizar y guardar imagen
      await sharp(file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(filePath.replace(fileExtension, '.webp'));

      const finalFilename = filename.replace(fileExtension, '.webp');
      const finalPath = filePath.replace(fileExtension, '.webp');

      // Generar thumbnails
      await this.generateThumbnails(file.buffer, finalFilename);

      this.logger.log(`Image uploaded: ${finalFilename}`);

      return {
        filename: finalFilename,
        url: `${this.baseUrl}/uploads/products/${finalFilename}`,
        path: finalPath,
        size: (await fs.stat(finalPath)).size,
        mimetype: 'image/webp',
      };
    } catch (error) {
      this.logger.error(`Failed to upload image: ${error.message}`);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Generar thumbnails de diferentes tamaños
   */
  private async generateThumbnails(
    buffer: Buffer,
    filename: string,
  ): Promise<void> {
    const baseFilename = filename.replace(/\.[^/.]+$/, '');

    for (const [size, dimensions] of Object.entries(this.thumbnailSizes)) {
      const thumbnailFilename = `${baseFilename}_${size}.webp`;
      const thumbnailPath = path.join(this.uploadDir, thumbnailFilename);

      await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
    }
  }

  /**
   * Eliminar imagen de producto
   */
  async deleteProductImage(filename: string): Promise<void> {
    if (!filename) return;

    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);

      // Eliminar thumbnails
      const baseFilename = filename.replace(/\.[^/.]+$/, '');
      for (const size of Object.keys(this.thumbnailSizes)) {
        const thumbnailPath = path.join(
          this.uploadDir,
          `${baseFilename}_${size}.webp`,
        );
        try {
          await fs.unlink(thumbnailPath);
        } catch {
          // Thumbnail might not exist, ignore error
        }
      }

      this.logger.log(`Image deleted: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to delete image ${filename}: ${error.message}`);
      // No lanzar error, solo log
    }
  }

  /**
   * Obtener URL de thumbnail
   */
  getThumbnailUrl(
    filename: string,
    size: 'small' | 'medium' | 'large' = 'medium',
  ): string {
    if (!filename) return '';

    const baseFilename = filename.replace(/\.[^/.]+$/, '');
    return `${this.baseUrl}/uploads/products/${baseFilename}_${size}.webp`;
  }

  /**
   * Obtener información de archivo
   */
  async getFileInfo(filename: string): Promise<UploadedFileInfo | null> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = await fs.stat(filePath);

      return {
        filename,
        url: `${this.baseUrl}/uploads/products/${filename}`,
        path: filePath,
        size: stats.size,
        mimetype: 'image/webp',
      };
    } catch {
      return null;
    }
  }
}
