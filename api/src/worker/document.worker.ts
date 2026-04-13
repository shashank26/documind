import { Job, Worker } from 'bullmq';
import pdf from 'pdf-parse';
import { S3 } from '../shared/aws/s3';
import { Chunk } from '../shared/chunk/Chunk';
import { chunkFile } from '../shared/chunk/chunker';
import { EmbeddingData, startEmbedding } from '../shared/chunk/embedding';
import { prisma } from '../shared/db/prisma';
import { Prisma } from '@prisma/client';
import { Config } from '../config';

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, DEBUG } = Config;

console.log(
  'CONNECTING to REDIS HOST: ',
  REDIS_HOST,
  '\nREDIS_PORT',
  REDIS_PORT,
);

const connection = DEBUG
  ? {
      host: REDIS_HOST,
      port: REDIS_PORT,
    }
  : {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      tls: {},
    };

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

const saveChunksToDatabase = async (
  documentId: string,
  buffer: EmbeddingData[],
) => {
  try {
    const insertData = buffer.map(
      (b) =>
        Prisma.sql`(
    ${documentId},
    ${b.chunk.data},
    ${b.chunk.chunkIndex},
    ${JSON.stringify(b.chunk.embedding)}::vector,
    ${b.chunk.tokenLength}
  )`,
    );

    return await prisma.$executeRaw`
      INSERT INTO document_chunks (document_id, content, chunk_index, embedding, token_length)
      VALUES ${Prisma.join(insertData)}
    `;
  } catch (err) {
    console.error(
      `Failed to insert chunkIds: ${buffer.map((b) => b.chunk.chunkIndex)}`,
      '\nerror: ',
      err,
    );
    return false;
  }
};

const logFailedChunks = (documentId: string, chunk: Chunk, error: any) => {
  console.error(
    `Failed to process chunk: ${chunk}, on documentId: ${documentId}, error:`,
    error,
  );
};

const processEmbeddings = async (
  inJobId: string,
  documentId: string,
  chunks: Chunk[],
) => {
  const embeddingData = startEmbedding(chunks);
  let failures = 0,
    processed = 0;
  const BUFFER_LENGTH = 50;
  let buffer: EmbeddingData[] = [];
  for await (let data of embeddingData) {
    if (data.error) {
      failures += 1;
      logFailedChunks(documentId, data.chunk, data.error);
      continue;
    } else if (buffer.length >= BUFFER_LENGTH) {
      const res = await saveChunksToDatabase(documentId, buffer);
      processed += buffer.length;
      if (!res) {
        failures += buffer.length;
      }
      await prisma.ingestionJob.update({
        where: { id: inJobId },
        data: {
          processed_chunks: processed,
        },
      });
      buffer = [];
    }
    buffer.push(data);
  }
  if (buffer.length > 0) {
    const res = await saveChunksToDatabase(documentId, buffer);
    processed += buffer.length;
    if (!res) {
      failures += buffer.length;
    }
    await prisma.ingestionJob.update({
      where: { id: inJobId },
      data: {
        processed_chunks: processed,
      },
    });
  }

  return { failures };
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
      const inJob = await prisma.ingestionJob.create({
        data: {
          status: 'PENDING',
          total_chunks: 0,
          document_id: documentId,
        },
      });

      const chunks = chunkFile(text);

      await prisma.ingestionJob.update({
        where: {
          id: inJob.id,
        },
        data: {
          status: 'PROCESSING',
          total_chunks: chunks.length,
        },
      });

      console.log(`Created Ingestion Job with Id: ${inJob.id}`);

      const { failures } = await processEmbeddings(
        inJob.id,
        documentId,
        chunks,
      );

      await prisma.ingestionJob.update({
        where: {
          id: inJob.id,
        },
        data: {
          status: failures > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        },
      });

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: failures > 0 ? 'FAILED' : 'READY',
        },
      });

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
      connection,
    },
  );

  worker.on('completed', (job) => {
    console.log('Job completed: ', job.id);
  });

  worker.on('failed', async (job) => {
    console.log('Job failed: ', job?.id);
    await prisma.task.update({
      where: {
        id: job?.data.taskId,
      },
      data: {
        status: 'FAILED',
        progress: 0,
      },
    });
  });
};
