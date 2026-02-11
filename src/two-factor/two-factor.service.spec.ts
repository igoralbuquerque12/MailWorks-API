import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './two-factor.service';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { CodeGeneratorHelper } from 'src/two-factor/helpers/code-generator.helper';
import { InternalServerErrorException } from '@nestjs/common';
import {
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_SECONDS,
} from 'src/two-factor/constants/two-factor.constants';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmailService = {
    send: jest.fn(),
  };

  const mockCodeGeneratorHelper = {
    generateNumericCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CodeGeneratorHelper, useValue: mockCodeGeneratorHelper },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    const dto = { email: 'teste@email.com' };
    const generatedCode = '123456';

    it('should generate code, save in cache, send email and return message', async () => {
      mockCodeGeneratorHelper.generateNumericCode.mockReturnValue(
        generatedCode,
      );
      mockCacheService.set.mockResolvedValue('OK');
      mockEmailService.send.mockResolvedValue(null);

      const result = await service.send(dto);

      expect(mockCodeGeneratorHelper.generateNumericCode).toHaveBeenCalledWith(
        TWO_FACTOR_CODE_LENGTH,
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `authentication:${dto.email}`,
        generatedCode,
        TWO_FACTOR_CODE_TTL_SECONDS,
      );

      expect(mockEmailService.send).toHaveBeenCalledWith({
        to: dto.email,
        subject: 'Seu código de verificação',
        content: `Seu código é: ${generatedCode}`,
      });

      expect(result).toEqual({
        message: 'Your two factor authentication has been sent!',
      });
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      mockCodeGeneratorHelper.generateNumericCode.mockReturnValue(
        generatedCode,
      );
      mockEmailService.send.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.send(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verify', () => {
    const dto = { email: 'teste@email.com', code: '123456' };

    it('should return true and delete cache if code matches', async () => {
      mockCacheService.get.mockResolvedValue('123456');
      mockCacheService.delete.mockResolvedValue(1);

      const result = await service.verify(dto);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `authentication:${dto.email}`,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `authentication:${dto.email}`,
      );
      expect(result).toBe(true);
    });

    it('should return false if code does not match', async () => {
      mockCacheService.get.mockResolvedValue('999999');

      const result = await service.verify(dto);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `authentication:${dto.email}`,
      );
      expect(mockCacheService.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if code is expired (null)', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.verify(dto);

      expect(result).toBe(false);
    });
  });
});
