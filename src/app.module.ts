import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { CapturasModule } from './capturas/capturas.module';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { RevisionesModule } from './revisiones/revisiones.module';
import { ReportesModule } from './reportes/reportes.module';
import { HealthcheckController } from './healthcheck/healthcheck.controller';
import { HealthcheckService } from './healthcheck/healthcheck.service';

@Module({
  imports: [AuthModule, UsuariosModule, CatalogosModule, CapturasModule, EvidenciasModule, RevisionesModule, ReportesModule],
  controllers: [AppController, HealthcheckController],
  providers: [AppService, HealthcheckService],
})
export class AppModule {}
