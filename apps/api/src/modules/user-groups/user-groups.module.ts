import { Module } from "@nestjs/common";
import { UserGroupsController } from "./user-groups.controller";
import { UserGroupsService } from "./user-groups.service";
import { UserGroupsRepository } from "./user-groups.repository";

@Module({
  controllers: [UserGroupsController],
  providers: [UserGroupsService, UserGroupsRepository],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
