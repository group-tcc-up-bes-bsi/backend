import { Test, TestingModule } from '@nestjs/testing';
import { DocumentVersionsService } from './document-versions.service';

describe.skip('DocumentVersionsService', () => {
  let service: DocumentVersionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentVersionsService],
    }).compile();

    service = module.get<DocumentVersionsService>(DocumentVersionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
