import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./infrastructure/supabase/supabase.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { UserGroupsModule } from "./modules/user-groups/user-groups.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { AccessEventsModule } from "./modules/access-events/access-events.module";
import { ResidentsModule } from "./modules/residents/residents.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    UserGroupsModule,
    TenantsModule,
    VehiclesModule,
    AccessEventsModule,
    ResidentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
