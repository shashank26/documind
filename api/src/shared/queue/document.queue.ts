import { Queue } from 'bullmq';
import { DOCUMENT_PROCESSING_WORKER_NAME } from '../../worker/document.worker';
import { Config } from '../../config';

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, DEBUG } = Config;

console.log(
  'CONNECTING to REDIS HOST: ',
  REDIS_HOST,
  '\nREDIS_PORT',
  REDIS_PORT,
);

export const documentQueue = DEBUG
  ? new Queue(DOCUMENT_PROCESSING_WORKER_NAME, {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    })
  : new Queue(DOCUMENT_PROCESSING_WORKER_NAME, {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        tls: {},
      },
    });
