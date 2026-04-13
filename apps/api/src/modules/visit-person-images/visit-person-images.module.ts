import { Module } from "@nestjs/common";
import { VisitPersonImagesController } from "./visit-person-images.controller";
import { VisitPersonImagesService } from "./visit-person-images.service";
import { VisitPersonImagesRepository } from "./visit-person-images.repository";

@Module({
  controllers: [VisitPersonImagesController],
  providers: [VisitPersonImagesService, VisitPersonImagesRepository],
  exports: [VisitPersonImagesService],
})
export class VisitPersonImagesModule {}
