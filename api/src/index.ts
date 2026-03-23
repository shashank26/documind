import { useUploadDocumentController } from './modules/document/document.controller';
import { DocumentService } from './modules/document/document.service';
import { initializeServer } from './server';
import { useSwagger } from './swagger';

const main = async () => {
  const server = await initializeServer([useSwagger]);
  try {
    useUploadDocumentController(server, new DocumentService());
    server.listen({
      port: 3001,
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

main();
