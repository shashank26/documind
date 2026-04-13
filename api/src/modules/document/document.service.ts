import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../../shared/db/prisma';
import { documentQueue } from '../../shared/queue/document.queue';
import { DOCUMENT_PROCESSING_WORKER_NAME } from '../../worker/document.worker';
import { UploadDocumentResponse } from './document.schema';
import { S3 } from '../../shared/aws/s3';

export class DocumentService {
  async upload(file: MultipartFile): Promise<UploadDocumentResponse> {
    if (!file?.filename) {
      throw new Error('File name is required');
    }

    const fileName = await this.uploadFile(file);

    const document = await prisma.document.create({
      data: {
        userId: '1',
        fileName: file.filename,
        fileUrl: fileName,
        status: 'UPLOADED',
      },
    });

    const task = await prisma.task.create({
      data: {
        documentId: document.id,
        type: 'DOCUMENT_PROCESSING',
        status: 'PENDING',
      },
    });

    await this.queueDocument(task.id, task.documentId);

    return {
      documentId: document.id,
      taskId: task.id,
      status: 'PENDING',
    };
  }

  async getTask(id: string) {
    return prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        errorMessage: true,
        documentId: true,
      },
    });
  }

  async queueDocument(taskId: string, documentId: string) {
    console.log('Queued:\ndocumentId:', documentId, '\ntaskId:', taskId);
    await documentQueue.add(DOCUMENT_PROCESSING_WORKER_NAME, {
      taskId: taskId,
      documentId: documentId,
    });
  }

  async uploadFile(file: MultipartFile) {
    const buffer = await file.toBuffer();
    return S3.upload(buffer, file.filename);
  }

  async documentExists(id: string) {
    const res = await prisma.document.findUnique({
      where: {
        id: id,
      },
    });

    if (id === res?.id) {
      return true;
    }

    return false;
  }
}
