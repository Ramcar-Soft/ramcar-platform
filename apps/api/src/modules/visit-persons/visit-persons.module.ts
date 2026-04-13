import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { VisitPersonsController } from "./visit-persons.controller";
import { VisitPersonsService } from "./visit-persons.service";
import { VisitPersonsRepository } from "./visit-persons.repository";

@Module({
  imports: [UsersModule],
  controllers: [VisitPersonsController],
  providers: [VisitPersonsService, VisitPersonsRepository],
  exports: [VisitPersonsService],
})
export class VisitPersonsModule {}
