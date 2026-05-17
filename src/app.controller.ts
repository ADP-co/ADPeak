import { Controller, Get } from '@nestjs/common';

@Controller('health') // La ruta final será /api/v1/health
export class AppController {
  
  @Get()
  check() {
    return {
      status: 'ADPeak API Operational',
      timestamp: new Date().toISOString(),
      sprint: 1,
      responsible: 'Julián Menatiní',
      institution: 'Universidad de Colima'
    };
  }
}