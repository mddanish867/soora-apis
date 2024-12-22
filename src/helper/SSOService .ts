import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
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

  // Generate OAuth URL for login
  async getAuthUrl(state: string): Promise<string> {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent', // Force consent screen to ensure refresh token
    });
  }

  async handleCallback(code: string): Promise<{ user: any; tokens: TokenSet }> {
    try {
      const { tokens } = await this.oauthClient.getToken(code);
      this.oauthClient.setCredentials(tokens);

      const ticket = await this.oauthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload() as UserPayload;
      const user = await this.findOrCreateUser(payload);

      // Generate token set
      const tokenSet = await this.generateTokenSet(user.id);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokenSet.refreshToken);

      // Update last login
      await this.updateLastLogin(user.id);

      return { user, tokens: tokenSet };
    } catch (error) {
      console.error('SSO callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  private async findOrCreateUser(payload: UserPayload) {
    const { sub, email, name, picture, email_verified, given_name, family_name } = payload;

    try {
      const user = await prisma.users.upsert({
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

      return user;
    } catch (error) {
      console.error('Error finding/creating user:', error);
      throw new Error('Failed to process user data');
    }
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
      expiresIn: 3600 // 1 hour in seconds
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days expiry
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token is valid in Redis
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new token set
      const tokenSet = await this.generateTokenSet(decoded.userId);

      // Update stored refresh token
      await this.storeRefreshToken(decoded.userId, tokenSet.refreshToken);

      return tokenSet;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  async revokeTokens(userId: string): Promise<void> {
    await redis.del(`refresh_token:${userId}`);
  }

  // Verify access token and get user
  async verifyAccessToken(accessToken: string): Promise<any> {
    try {
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
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Update user's last login
  private async updateLastLogin(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  // Get user session info
  async getUserSession(userId: string): Promise<any> {
    try {
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
    } catch (error) {
      throw new Error('Failed to get user session');
    }
  }

  // Check if email is already registered
  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { email },
    });
    return !!user;
  }
}