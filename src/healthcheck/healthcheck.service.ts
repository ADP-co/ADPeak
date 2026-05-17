import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthcheckService {
	getHealth() {
		return { status: 'ok', timestamp: new Date().toISOString() };
	}
}
