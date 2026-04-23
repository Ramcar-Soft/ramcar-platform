import { syncUserAppMetadata } from "./sync-user-app-metadata";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeClient(rpcResp: unknown = { error: null }) {
  const rpc = jest.fn().mockResolvedValue(rpcResp);
  return {
    client: { rpc } as unknown as SupabaseClient,
    rpc,
  };
}

describe("syncUserAppMetadata", () => {
  it("calls sync_user_app_metadata RPC with the tenant_ids patch", async () => {
    const { client, rpc } = makeClient();

    await syncUserAppMetadata(client, "user-1", {
      tenant_ids: ["t-1", "t-2"],
    });

    expect(rpc).toHaveBeenCalledWith("sync_user_app_metadata", {
      p_user_id: "user-1",
      p_patch: { tenant_ids: ["t-1", "t-2"] },
    });
  });

  it("accepts the wildcard '*' for tenant_ids", async () => {
    const { client, rpc } = makeClient();

    await syncUserAppMetadata(client, "u", { tenant_ids: "*" });

    expect(rpc).toHaveBeenCalledWith("sync_user_app_metadata", {
      p_user_id: "u",
      p_patch: { tenant_ids: "*" },
    });
  });

  it("accepts an empty array for tenant_ids", async () => {
    const { client, rpc } = makeClient();

    await syncUserAppMetadata(client, "u", { tenant_ids: [] });

    expect(rpc).toHaveBeenCalledWith("sync_user_app_metadata", {
      p_user_id: "u",
      p_patch: { tenant_ids: [] },
    });
  });

  it("forwards multiple fields in a single patch object", async () => {
    const { client, rpc } = makeClient();

    await syncUserAppMetadata(client, "u", {
      tenant_ids: ["t-a"],
      tenant_id: "t-a",
      role: "admin",
    });

    expect(rpc).toHaveBeenCalledWith("sync_user_app_metadata", {
      p_user_id: "u",
      p_patch: { tenant_ids: ["t-a"], tenant_id: "t-a", role: "admin" },
    });
  });

  it("skips the RPC call when the patch is empty", async () => {
    const { client, rpc } = makeClient();

    await syncUserAppMetadata(client, "u", {});

    expect(rpc).not.toHaveBeenCalled();
  });

  it("throws when the RPC returns an error", async () => {
    const { client } = makeClient({ error: new Error("rpc failed") });

    await expect(
      syncUserAppMetadata(client, "u", { tenant_ids: ["t"] }),
    ).rejects.toThrow("rpc failed");
  });
});
