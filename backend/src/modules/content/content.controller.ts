/**
 * ContentController (T060) — expone el contenido informativo público.
 * GET /content/donation-info (bajo el prefijo global /api/v1).
 */
import { Controller, Get } from '@nestjs/common';
import { ContentService, type DonationInfo } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('donation-info')
  getDonationInfo(): DonationInfo {
    return this.content.getDonationInfo();
  }
}
