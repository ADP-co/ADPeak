import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CapturasController } from './capturas.controller';
import { CapturasService } from './capturas.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CapturasController],
  providers: [CapturasService],
  exports: [CapturasService],
})
export class CapturasModule {}
