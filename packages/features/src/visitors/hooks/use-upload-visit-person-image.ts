import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useUploadVisitPersonImage() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: ({
      visitPersonId,
      file,
      imageType,
    }: {
      visitPersonId: string;
      file: File;
      imageType: ImageType;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("imageType", imageType);
      return transport.upload<VisitPersonImage>(
        `/visit-persons/${visitPersonId}/images`,
        formData,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["access-events", activeTenantId, "images", variables.visitPersonId],
      });
    },
  });
}
