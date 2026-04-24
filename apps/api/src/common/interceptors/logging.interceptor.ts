import type { NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      headers?: Record<string, string>;
    }>();
    const { method, url } = req;
    const tenantId = req.headers?.["x-active-tenant-id"] ?? "—";
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} [tenant:${tenantId}] +${ms}ms`);
      }),
    );
  }
}
