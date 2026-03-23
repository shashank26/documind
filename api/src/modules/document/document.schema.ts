import { z } from 'zod';

export const UploadDocumentResponseSchema = z.object({
  documentId: z.string(),
  taskId: z.string(),
  status: z.enum(['PENDING']),
});

export type UploadDocumentResponse = z.infer<
  typeof UploadDocumentResponseSchema
>;
