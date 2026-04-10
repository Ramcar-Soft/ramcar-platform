import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Vehicle, CreateVehicleInput } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      apiClient.post<Vehicle>("/vehicles", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["residents", variables.userId, "vehicles"],
      });
    },
  });
}
