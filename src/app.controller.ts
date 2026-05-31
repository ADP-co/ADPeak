import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  check() {
    return {
      status: 'ADPeak API Operational',
      timestamp: new Date().toISOString(),
      sprint: 1,
      responsible: 'Julian Menatini',
      institution: 'Universidad de Colima',
    };
  }
}
