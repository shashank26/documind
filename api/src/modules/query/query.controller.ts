import fastify, { FastifyInstance } from 'fastify';
import { QueryService } from './query.service';
import { DocumentService } from '../document/document.service';

export const useQueryController = (
  fastify: FastifyInstance,
  service: QueryService,
  docService: DocumentService,
) => {
  fastify.get<{
    Params: { documentId: string };
    Querystring: { query: string };
  }>('/query/:documentId', async (req, rep) => {
    const { documentId } = req.params;
    const documentExists = await docService.documentExists(documentId);
    if (!documentExists) {
      throw rep.code(404).send(new Error('Document Id invalid or not found'));
    }
    const { query } = req.query;
    const { response } = await service.makeQueryUsingHybridSearch(
      documentId,
      query,
    );
    return {
      response,
    };
  });
};
