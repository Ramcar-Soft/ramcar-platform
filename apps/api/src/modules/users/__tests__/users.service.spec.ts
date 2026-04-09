import { Test, TestingModule } from "@nestjs/testing";
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { UsersService } from "../users.service";
import { UsersRepository } from "../users.repository";
import { UserGroupsService } from "../../user-groups/user-groups.service";

const mockRepository = {
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  toggleStatus: jest.fn(),
  countActiveSuperAdmins: jest.fn(),
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
};

const mockUserGroupsService = {
  findAll: jest.fn().mockResolvedValue([
    { id: "g1", name: "Moroso" },
    { id: "g2", name: "Cumplido" },
  ]),
};

function makeAuthUser(
  role: string,
  tenantId = "tenant-1",
  userId = "actor-1",
) {
  return {
    id: userId,
    app_metadata: { role, tenant_id: tenantId },
  };
}

function makeProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    user_id: "user-1",
    tenant_id: "tenant-1",
    full_name: "Test User",
    email: "test@example.com",
    role: "guard",
    address: null,
    username: null,
    phone: null,
    phone_type: null,
    status: "active",
    user_group_ids: [],
    observations: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    tenants: { name: "Tenant 1" },
    ...overrides,
  };
}

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
        { provide: UserGroupsService, useValue: mockUserGroupsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe("list", () => {
    const filters = {
      page: 1,
      pageSize: 10,
      sortBy: "full_name" as const,
      sortOrder: "asc" as const,
    };

    it("returns paginated users with meta", async () => {
      mockRepository.list.mockResolvedValue({
        data: [makeProfileRow()],
        total: 1,
      });

      const result = await service.list(
        filters,
        makeAuthUser("admin"),
        "tenant-1",
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("admin is scoped to own tenant", async () => {
      mockRepository.list.mockResolvedValue({ data: [], total: 0 });

      await service.list(filters, makeAuthUser("admin"), "tenant-1");

      expect(mockRepository.list).toHaveBeenCalledWith(filters, "tenant-1");
    });

    it("super_admin sees all tenants", async () => {
      mockRepository.list.mockResolvedValue({ data: [], total: 0 });

      await service.list(filters, makeAuthUser("super_admin"), "tenant-1");

      expect(mockRepository.list).toHaveBeenCalledWith(filters, undefined);
    });

    it("computes canEdit and canDeactivate per user row", async () => {
      mockRepository.list.mockResolvedValue({
        data: [
          makeProfileRow({ role: "guard" }),
          makeProfileRow({ id: "p2", role: "super_admin" }),
        ],
        total: 2,
      });

      const result = await service.list(
        filters,
        makeAuthUser("admin"),
        "tenant-1",
      );

      expect(result.data[0].canEdit).toBe(true);
      expect(result.data[1].canEdit).toBe(false);
    });
  });

  describe("getById", () => {
    it("returns user by id", async () => {
      mockRepository.getById.mockResolvedValue(makeProfileRow());

      const result = await service.getById(
        "profile-1",
        makeAuthUser("admin"),
        "tenant-1",
      );

      expect(result.id).toBe("profile-1");
    });

    it("throws NotFoundException when user does not exist", async () => {
      mockRepository.getById.mockResolvedValue(null);

      await expect(
        service.getById("missing", makeAuthUser("admin"), "tenant-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("admin cannot see users from different tenant", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ tenant_id: "other-tenant" }),
      );

      await expect(
        service.getById("profile-1", makeAuthUser("admin"), "tenant-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("super_admin can see users from any tenant", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ tenant_id: "other-tenant" }),
      );

      const result = await service.getById(
        "profile-1",
        makeAuthUser("super_admin"),
        "tenant-1",
      );

      expect(result.id).toBe("profile-1");
    });
  });

  describe("create", () => {
    const dto = {
      fullName: "New User",
      email: "new@example.com",
      role: "guard" as const,
      tenantId: "tenant-1",
      address: "123 Main St",
      username: "newuser",
      phone: "555-0100",
      userGroupIds: [],
    };

    beforeEach(() => {
      mockRepository.checkEmailExists.mockResolvedValue(false);
      mockRepository.checkUsernameExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        profile: makeProfileRow(),
        recoveryLink: null,
      });
    });

    it("creates user successfully", async () => {
      const result = await service.create(
        dto,
        makeAuthUser("admin"),
        "tenant-1",
      );

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });

    it("admin cannot assign super_admin role", async () => {
      await expect(
        service.create(
          { ...dto, role: "super_admin" },
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("admin cannot assign admin role", async () => {
      await expect(
        service.create(
          { ...dto, role: "admin" },
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("super_admin can assign any role", async () => {
      for (const role of [
        "super_admin",
        "admin",
        "guard",
        "resident",
      ] as const) {
        jest.clearAllMocks();
        mockRepository.checkEmailExists.mockResolvedValue(false);
        mockRepository.checkUsernameExists.mockResolvedValue(false);
        mockRepository.create.mockResolvedValue({
          profile: makeProfileRow(),
          recoveryLink: null,
        });

        await service.create(
          { ...dto, role },
          makeAuthUser("super_admin"),
          "tenant-1",
        );

        expect(mockRepository.create).toHaveBeenCalled();
      }
    });

    it("admin cannot create user in another tenant", async () => {
      await expect(
        service.create(
          { ...dto, tenantId: "other-tenant" },
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects duplicate email", async () => {
      mockRepository.checkEmailExists.mockResolvedValue(true);

      await expect(
        service.create(dto, makeAuthUser("admin"), "tenant-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("rejects duplicate username", async () => {
      mockRepository.checkUsernameExists.mockResolvedValue(true);

      await expect(
        service.create(
          { ...dto, username: "taken" },
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    const dto = {
      fullName: "Updated Name",
      email: "updated@example.com",
      role: "guard" as const,
      tenantId: "tenant-1",
      address: "456 Oak Ave",
      username: "updateduser",
      phone: "555-0200",
    };

    beforeEach(() => {
      mockRepository.getById.mockResolvedValue(makeProfileRow());
      mockRepository.checkEmailExists.mockResolvedValue(false);
      mockRepository.checkUsernameExists.mockResolvedValue(false);
      mockRepository.update.mockResolvedValue(makeProfileRow());
    });

    it("updates user successfully", async () => {
      const result = await service.update(
        "profile-1",
        dto,
        makeAuthUser("admin"),
        "tenant-1",
      );

      expect(result).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalledWith("profile-1", dto);
    });

    it("admin cannot edit super_admin user", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ role: "super_admin" }),
      );

      await expect(
        service.update(
          "profile-1",
          dto,
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("admin cannot change role to super_admin", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ role: "guard" }),
      );

      await expect(
        service.update(
          "profile-1",
          { ...dto, role: "super_admin" as const },
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects if user not found", async () => {
      mockRepository.getById.mockResolvedValue(null);

      await expect(
        service.update(
          "missing",
          dto,
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("toggleStatus", () => {
    beforeEach(() => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ user_id: "target-user" }),
      );
      mockRepository.toggleStatus.mockResolvedValue(
        makeProfileRow({ status: "inactive" }),
      );
    });

    it("deactivates user successfully", async () => {
      const result = await service.toggleStatus(
        "profile-1",
        "inactive",
        makeAuthUser("admin", "tenant-1", "actor-1"),
        "tenant-1",
      );

      expect(result).toBeDefined();
      expect(mockRepository.toggleStatus).toHaveBeenCalledWith(
        "profile-1",
        "inactive",
      );
    });

    it("prevents self-deactivation", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ user_id: "actor-1" }),
      );

      await expect(
        service.toggleStatus(
          "profile-1",
          "inactive",
          makeAuthUser("admin", "tenant-1", "actor-1"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("prevents deactivating last super admin", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ role: "super_admin", user_id: "target-user" }),
      );
      mockRepository.countActiveSuperAdmins.mockResolvedValue(1);

      await expect(
        service.toggleStatus(
          "profile-1",
          "inactive",
          makeAuthUser("super_admin", "tenant-1", "actor-1"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows deactivating super admin when others exist", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ role: "super_admin", user_id: "target-user" }),
      );
      mockRepository.countActiveSuperAdmins.mockResolvedValue(3);
      mockRepository.toggleStatus.mockResolvedValue(
        makeProfileRow({ role: "super_admin", status: "inactive" }),
      );

      const result = await service.toggleStatus(
        "profile-1",
        "inactive",
        makeAuthUser("super_admin", "tenant-1", "actor-1"),
        "tenant-1",
      );

      expect(result).toBeDefined();
    });

    it("admin cannot deactivate super_admin", async () => {
      mockRepository.getById.mockResolvedValue(
        makeProfileRow({ role: "super_admin", user_id: "target-user" }),
      );

      await expect(
        service.toggleStatus(
          "profile-1",
          "inactive",
          makeAuthUser("admin", "tenant-1", "actor-1"),
          "tenant-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects if user not found", async () => {
      mockRepository.getById.mockResolvedValue(null);

      await expect(
        service.toggleStatus(
          "missing",
          "inactive",
          makeAuthUser("admin"),
          "tenant-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
