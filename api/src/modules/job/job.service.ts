import { prisma } from '../../shared/db/prisma';

export class JobService {
  async getJob(id: string) {
    return prisma.ingestionJob.findUnique({
      where: {
        id: id,
      },
    });
  }
}
