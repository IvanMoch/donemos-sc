/**
 * AdminAuthService (T121) — autenticación del administrador (research §6).
 *
 * Verifica usuario + contraseña (bcrypt) y firma un JWT HS256 con TTL 8h. Toda
 * mutación de sesión (login/failed_login) queda en el audit log. Nunca revela
 * si falló el usuario o la contraseña (mismo 401).
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';

export interface AdminProfile {
  id: string;
  username: string;
  fullName: string;
}

const NO_AUTORIZADO = { error: 'unauthorized', message: 'Credenciales inválidas.' };

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AdminAuditLogService,
  ) {}

  /** Valida credenciales; firma el JWT y registra login/failed_login. */
  async login(username: string, password: string, ip?: string): Promise<{ token: string; admin: AdminProfile }> {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException(NO_AUTORIZADO);
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      await this.audit.record({ adminId: admin.id, action: 'failed_login', targetType: 'session', ipAddress: ip });
      throw new UnauthorizedException(NO_AUTORIZADO);
    }

    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username });
    await this.audit.record({ adminId: admin.id, action: 'login', targetType: 'session', ipAddress: ip });
    return { token, admin: { id: admin.id, username: admin.username, fullName: admin.fullName } };
  }

  async getProfile(id: string): Promise<AdminProfile> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException(NO_AUTORIZADO);
    return { id: admin.id, username: admin.username, fullName: admin.fullName };
  }
}
