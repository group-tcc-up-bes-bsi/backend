import { Test, TestingModule } from '@nestjs/testing';
import { DocumentVersionsController } from './document-versions.controller';
import { DocumentVersionsService } from './document-versions.service';

describe.skip('DocumentVersionsController', () => {
  let controller: DocumentVersionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentVersionsController],
      providers: [DocumentVersionsService],
    }).compile();

    controller = module.get<DocumentVersionsController>(DocumentVersionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
