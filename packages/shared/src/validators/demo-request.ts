import { z } from "zod";

export const residentCountOptions = ["<50", "50-150", "150-500", "500+"] as const;

export const demoRequestLeadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  communityName: z.string().min(2).max(200),
  residentCount: z.enum(residentCountOptions),
});

export type DemoRequestLead = z.infer<typeof demoRequestLeadSchema>;
