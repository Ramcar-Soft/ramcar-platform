import { UnsupportedMediaTypeException } from "@nestjs/common";
import { TENANT_IMAGE_ALLOWED_MIME } from "@ramcar/shared";
import type { Request } from "express";

export function acceptImageMimes(
  _req: Request,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (TENANT_IMAGE_ALLOWED_MIME.includes(file.mimetype as typeof TENANT_IMAGE_ALLOWED_MIME[number])) {
    cb(null, true);
  } else {
    cb(new UnsupportedMediaTypeException("Only JPEG, PNG, and WebP images are allowed"), false);
  }
}
