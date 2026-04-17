import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useUploadVisitPersonImage() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { tenantId } = useRole();

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
        queryKey: ["access-events", tenantId, "images", variables.visitPersonId],
      });
    },
  });
}
