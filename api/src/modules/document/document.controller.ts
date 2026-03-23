import { FastifyInstance, FastifySchema } from 'fastify';
import { DocumentService } from './document.service';
import { documentQueue } from '../../shared/queue/document.queue';
import { DOCUMENT_PROCESSING_WORKER_NAME } from '../../worker/document.worker';
import { MAX_FILE_SIZE } from '../../server';

const swaggerSchemaForPostDocuments: FastifySchema = {
  response: {
    201: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        taskId: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
};

const swaggerSchemaForGetTaskId: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        id: { type: 'string' },
        progress: { type: 'number' },
        error: { type: 'object' },
      },
    },
  },
};

export const useUploadDocumentController = (
  fastify: FastifyInstance,
  service: DocumentService,
) => {
  fastify.post(
    '/documents',
    {
      schema: swaggerSchemaForPostDocuments,
    },
    async (req, rep) => {
      const file = await req.file();

      if (!file?.filename) {
        throw new Error('File is required');
      }

      if (file.file.truncated) {
        throw new Error('File too large');
      }

      if (file.file.bytesRead > MAX_FILE_SIZE) {
        throw new Error('File exceeds size limit');
      }

      const result = await service.upload(file);

      return result;
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/task/:id',
    {
      schema: swaggerSchemaForGetTaskId,
    },
    async (req, rep) => {
      const task = await service.getTask(req.params.id);

      if (!task) {
        throw new Error('Task not found');
      }

      return task;
    },
  );

  // debug
  fastify.put<{ Params: { id: string } }>('/task/:id', async (req, rep) => {
    const task = await service.getTask(req.params.id);
    if (!task) {
      throw new Error('Task not found');
    }

    documentQueue.add(DOCUMENT_PROCESSING_WORKER_NAME, {
      taskId: task.id,
      documentId: task.documentId,
    });

    return task;
  });
};
