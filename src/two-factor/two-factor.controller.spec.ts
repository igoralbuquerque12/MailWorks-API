import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;

  const mockTwoFactorService = {
    send: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
      ],
    }).compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('send', () => {
    it('should call service.send and return the result', async () => {
      const body = { email: 'teste@email.com' };
      const expectedResult = {
        message: 'Your two factor authentication has been sent!',
      };

      mockTwoFactorService.send.mockResolvedValue(expectedResult);

      const result = await controller.send(body);

      expect(mockTwoFactorService.send).toHaveBeenCalledWith(body);
      expect(result).toEqual(expectedResult);
    });
  });
});
