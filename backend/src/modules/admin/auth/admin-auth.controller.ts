/**
 * AdminAuthController (T122) — login/logout/perfil del administrador.
 *
 * La cookie `session` es HttpOnly + Secure + SameSite=Strict con TTL 8h
 * (research §6). Login está limitado (throttle) contra fuerza bruta. /admin/me
 * requiere sesión válida (AdminGuard).
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AdminGuard, type AdminUserContext } from '../../../common/guards/admin.guard';
import { AdminAuthService, type AdminProfile } from './admin-auth.service';
import { LoginDto } from '../dto/admin.dto';

const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;

const OPCIONES_COOKIE = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('auth/login')
  @HttpCode(204)
  // Bucket estricto anti-fuerza-bruta (research §10).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { token } = await this.auth.login(dto.username, dto.password, req.ip);
    res.cookie('session', token, { ...OPCIONES_COOKIE, maxAge: OCHO_HORAS_MS });
  }

  @Post('auth/logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie('session', OPCIONES_COOKIE);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() req: Request & { adminUser?: AdminUserContext }): Promise<AdminProfile> {
    if (!req.adminUser) throw new UnauthorizedException({ error: 'unauthorized', message: 'No autorizado.' });
    return this.auth.getProfile(req.adminUser.id);
  }
}
