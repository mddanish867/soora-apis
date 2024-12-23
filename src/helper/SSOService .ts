import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient, } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

interface SSOConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  provider: 'google' | 'microsoft';
}

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface UserSession {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  isVerified: boolean | null;
  lastLogin: Date;
  ssoProvider: string | null;
}

export class SSOService {
  private oauthClient: OAuth2Client;
  private config: SSOConfig;

  constructor(config: SSOConfig) {
    this.config = config;
    this.oauthClient = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async getAuthUrl(state: string): Promise<string> {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<{  tokens: TokenSet }> {
    try {
      const { tokens } = await this.oauthClient.getToken(code);
      this.oauthClient.setCredentials(tokens);

      const ticket = await this.oauthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload() as UserPayload;
      const user = await this.findOrCreateUser(payload);
      const tokenSet = await this.generateTokenSet(user.id);
      await this.storeRefreshToken(user.id, tokenSet.refreshToken);
      await this.updateLastLogin(user.id);

      return {tokens: tokenSet };
    } catch (err) {
      console.error('SSO callback error:', err);
      throw new Error('Authentication failed');
    }
  }

  private async findOrCreateUser(payload: UserPayload) {
    const { sub, email, name, picture, email_verified, given_name, family_name } = payload;

    return await prisma.users.upsert({
      where: { email },
      update: {
        name: name || `${given_name} ${family_name}`.trim(),
        picture,
        lastLogin: new Date(),
        isVerified: email_verified || false,
      },
      create: {
        email,
        name: name || `${given_name} ${family_name}`.trim(),
        picture: picture || '',
        ssoProvider: this.config.provider,
        ssoId: sub,
        isVerified: email_verified || false,
        lastLogin: new Date(),
      },
    });
  }

  private async generateTokenSet(userId: string): Promise<TokenSet> {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60);
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet | null> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      const tokenSet = await this.generateTokenSet(decoded.userId);
      await this.storeRefreshToken(decoded.userId, tokenSet.refreshToken);

      return tokenSet;
    } catch (err) {
      console.error('Token refresh error:', err);
      return null;
    }
  }

  async revokeTokens(userId: string): Promise<void> {
    await redis.del(`refresh_token:${userId}`);
  }

  async verifyAccessToken(accessToken: string) {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async getUserSession(userId: string): Promise<UserSession> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        isVerified: true,
        lastLogin: true,
        ssoProvider: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { email },
    });
    return !!user;
  }
}