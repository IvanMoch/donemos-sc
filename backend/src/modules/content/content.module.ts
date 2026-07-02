/**
 * ContentModule (T061) — contenido informativo de la landing.
 */
import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
