import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { VehiclesModule } from "../vehicles/vehicles.module";
import { ResidentsController } from "./residents.controller";
import { ResidentsService } from "./residents.service";

@Module({
  imports: [UsersModule, VehiclesModule],
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class ResidentsModule {}
