import multipart from '@fastify/multipart';
import Fastify, { FastifyInstance } from 'fastify';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const initializeServer = async (
  dependencies: [(server: FastifyInstance) => Promise<void>],
) => {
  const fastify = Fastify({
    logger: true,
  });
  fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });

  await Promise.allSettled(dependencies.map((dep) => dep(fastify)));

  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    async function handler(req, rep) {
      return { data: 'Hello World 2' };
    },
  );

  return fastify;
};
