import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

type SupabaseJwtPayload = JWTPayload & {
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type JwksResolver = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: JwksResolver;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>("SUPABASE_URL");
    this.jwks = createRemoteJWKSet(
      new URL("/auth/v1/.well-known/jwks.json", supabaseUrl),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: SupabaseJwtPayload;
    try {
      const result = await jwtVerify<SupabaseJwtPayload>(token, this.jwks, {
        algorithms: ["ES256", "RS256"],
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    request.authUser = {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata ?? {},
      user_metadata: payload.user_metadata ?? {},
    };
    request.authToken = token;
    return true;
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const authorization = request.headers["authorization"];
    if (!authorization) return null;
    const [type, token] = authorization.split(" ");
    return type === "Bearer" ? token : null;
  }
}
