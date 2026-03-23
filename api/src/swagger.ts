import { FastifyInstance } from 'fastify/types/instance';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function useSwagger(server: FastifyInstance) {
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'arniparth.documind.api',
        description: 'arniparth.documind.api',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
        },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: 'swagger',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });
}
