import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { TenantsModule } from "../tenants/tenants.module";
import { AccessEventsController } from "./access-events.controller";
import { AccessEventsService } from "./access-events.service";
import { AccessEventsRepository } from "./access-events.repository";

@Module({
  imports: [UsersModule, TenantsModule],
  controllers: [AccessEventsController],
  providers: [AccessEventsService, AccessEventsRepository],
  exports: [AccessEventsService],
})
export class AccessEventsModule {}
