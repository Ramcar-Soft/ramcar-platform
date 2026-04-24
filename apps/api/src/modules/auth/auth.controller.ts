import { Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@ramcar/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SkipTenant } from "../../common/decorators/skip-tenant.decorator";
import { AuthService } from "./auth.service";

@Controller("auth")
@UseGuards(JwtAuthGuard, TenantGuard)
@SkipTenant()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  async getMe(@CurrentUser() user: User): Promise<UserProfile> {
    return this.authService.getProfile(user.id);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(): Promise<{ message: string }> {
    return { message: "Logged out successfully" };
  }
}
