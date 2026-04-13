import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useUploadVisitPersonImage() {
  const queryClient = useQueryClient();

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
      return apiClient.upload<VisitPersonImage>(
        `/visit-persons/${visitPersonId}/images`,
        formData,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["access-events", "images", variables.visitPersonId],
      });
    },
  });
}
