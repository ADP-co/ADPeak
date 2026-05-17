import { HealthcheckService } from './healthcheck.service';
export declare class HealthcheckController {
    private readonly healthcheckService;
    constructor(healthcheckService: HealthcheckService);
    getHealth(): {
        status: string;
        timestamp: string;
    };
}
