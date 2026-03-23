import { Queue } from 'bullmq';
import { DOCUMENT_PROCESSING_WORKER_NAME } from '../../worker/document.worker';

const connection = {
  host: '127.0.0.1',
  port: 6379,
};

export const documentQueue = new Queue(DOCUMENT_PROCESSING_WORKER_NAME, {
  connection,
});
