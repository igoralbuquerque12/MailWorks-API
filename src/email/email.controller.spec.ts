import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { SendEmailDTO } from './dto/send-email-dto';

describe('EmailController', () => {
  let controller: EmailController;

  const mockEmailService = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should call emailService.send with correct parameters', async () => {
      const dto: SendEmailDTO = {
        to: 'user@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
      };

      mockEmailService.send.mockResolvedValue(undefined);

      await controller.sendEmail(dto);

      expect(mockEmailService.send).toHaveBeenCalledWith(dto);
    });

    it('should throw if emailService.send throws', async () => {
      const dto: SendEmailDTO = {
        to: 'user@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
      };

      const error = new Error('Service Error');
      mockEmailService.send.mockRejectedValue(error);

      await expect(controller.sendEmail(dto)).rejects.toThrow(error);
    });
  });
});
