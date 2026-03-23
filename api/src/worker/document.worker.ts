import { Job, Worker } from 'bullmq';
import { prisma } from '../shared/db/prisma';
import { S3 } from '../shared/aws/s3';
import pdf from 'pdf-parse';

export const DOCUMENT_PROCESSING_WORKER_NAME = 'DOCUMENT_PROCESSING';

const downloadFile = (fileUrl: string) => {
  return S3.download(fileUrl);
};

const pdfParser = async (fileName: string, buffer: Buffer) => {
  if (fileName.endsWith('.pdf')) {
    const data = await new pdf.PDFParse({
      data: buffer,
    });
    return (await data.getText()).text;
  }

  if (fileName.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  throw new Error('Unsupported file type');
};

export const startWorker = () => {
  const worker = new Worker(
    DOCUMENT_PROCESSING_WORKER_NAME,
    async (
      job: Job<{
        taskId: string;
        documentId: string;
      }>,
    ) => {
      const { documentId, taskId } = job.data;
      console.log(
        'Processing: JobId:',
        job.id,
        'TaskId: ',
        taskId,
        'DocumentId: ',
        documentId,
      );

      const { fileUrl, fileName } = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
        select: {
          fileUrl: true,
          fileName: true,
        },
      });

      if (!fileUrl) throw new Error('Document/URL not found');

      const buffer = await downloadFile(fileUrl);

      console.log('Downloaded file size:', buffer.length);

      const text = await pdfParser(fileName, buffer);

      console.log(text);

      await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          status: 'COMPLETED',
          progress: 100,
        },
      });
    },
    {
      connection: {
        host: '127.0.0.1',
        port: 6379,
      },
    },
  );

  worker.on('completed', (job) => {
    console.log('Job completed: ', job.id);
  });

  worker.on('failed', async (job) => {
    console.log('Job failed: ', job?.id);
    await prisma.task.update({
      where: {
        id: job.data.taskId,
      },
      data: {
        status: 'FAILED',
        progress: 0,
      },
    });
  });
};
