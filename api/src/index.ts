import { Config } from './config';
import { useUploadDocumentController } from './modules/document/document.controller';
import { DocumentService } from './modules/document/document.service';
import { useJobController } from './modules/job/job.controller';
import { JobService } from './modules/job/job.service';
import { useQueryController } from './modules/query/query.controller';
import { QueryService } from './modules/query/query.service';
import { initializeServer } from './server';
import { useSwagger } from './swagger';

const { DEBUG } = Config;

const main = async () => {
  const server = await initializeServer([useSwagger]);
  const services = {
    documentService: new DocumentService(),
    jobService: new JobService(),
    queryService: new QueryService(),
  };
  try {
    useUploadDocumentController(server, services.documentService);
    useJobController(server, services.jobService);
    useQueryController(server, services.queryService, services.documentService);
    server.listen({
      port: 3001,
      host: DEBUG ? 'localhost' : '0.0.0.0',
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

main();
