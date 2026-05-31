import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns API health metadata', () => {
    expect(appController.check()).toMatchObject({
      status: 'ADPeak API Operational',
      sprint: 1,
      institution: 'Universidad de Colima',
    });
  });
});
