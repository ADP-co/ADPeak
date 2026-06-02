import { Module } from '@nestjs/common';
import { CapturasModule } from '../capturas/capturas.module';
import { RevisionesController } from './revisiones.controller';

@Module({
  imports: [CapturasModule],
  controllers: [RevisionesController],
})
export class RevisionesModule {}
