import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: {},
              error: {},
              details: {},
            }),
          },
        },
        {
          provide: HttpHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check status', async () => {
      const result = await controller.check();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('should return readiness status', () => {
      const result = controller.ready();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.ready();
      const date = new Date(result.timestamp);
      
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(result.timestamp);
    });
  });

  describe('live', () => {
    it('should return liveness status', () => {
      const result = controller.live();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });

    it('should return current timestamp', () => {
      const before = Date.now();
      const result = controller.live();
      const after = Date.now();
      
      const timestamp = new Date(result.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
