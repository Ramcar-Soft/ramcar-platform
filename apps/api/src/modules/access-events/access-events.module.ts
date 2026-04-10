import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AccessEventsController } from "./access-events.controller";
import { AccessEventsService } from "./access-events.service";
import { AccessEventsRepository } from "./access-events.repository";

@Module({
  imports: [UsersModule],
  controllers: [AccessEventsController],
  providers: [AccessEventsService, AccessEventsRepository],
  exports: [AccessEventsService],
})
export class AccessEventsModule {}
