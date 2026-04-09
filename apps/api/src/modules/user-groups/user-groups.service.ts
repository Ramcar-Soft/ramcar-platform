import { Injectable } from "@nestjs/common";
import { UserGroupsRepository } from "./user-groups.repository";

@Injectable()
export class UserGroupsService {
  constructor(private readonly repository: UserGroupsRepository) {}

  async findAll() {
    return this.repository.findAll();
  }
}
