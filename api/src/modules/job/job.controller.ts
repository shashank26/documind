import { FastifyInstance, FastifySchema } from 'fastify';
import { JobService } from './job.service';

export const useJobController = (
  fastify: FastifyInstance,
  service: JobService,
) => {
  fastify.get<{ Params: { id: string } }>('/job/:id', async (req, rep) => {
    const jobId = await req.params.id;

    return service.getJob(jobId);
  });
};
