import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'itd-secret-key-2024',
    });
  }

  async validate(payload: { sub?: string; userId?: string; id?: string; username: string; accountType: string }) {
    const userId = payload.sub || payload.userId || payload.id;
    if (!userId) {
      throw new UnauthorizedException('无效的登录凭证');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: true },
    });

    if (!user || !user.account) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.account.status === 'DISABLED') {
      throw new UnauthorizedException('账号已禁用');
    }

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      accountType: user.account.accountType,
      status: user.account.status,
    };
  }
}
