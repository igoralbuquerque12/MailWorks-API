import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { SendEmailDTO } from './dto/send-email-dto';
import * as nodemailer from 'nodemailer';

const mockTransporter = {
  verify: jest.fn(),
  sendMail: jest.fn(),
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn(),
    sendMail: jest.fn(),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    const dto: SendEmailDTO = {
      to: 'test@example.com',
      subject: 'Hello',
      content: 'World',
    };

    it('should send email successfully when credentials are valid', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'EMAIL') return 'my@email.com';
        if (key === 'PASSWORD_EMAIL') return '123456';
        return null;
      });

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue('Email Sent');

      await service.send(dto);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { user: 'my@email.com', pass: '123456' },
        }),
      );
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Services Igor A. <my@email.com>',
        to: dto.to,
        subject: dto.subject,
        html: `<p>${dto.content}</p>`,
      });
    });

    it('should throw error if credentials are missing', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(service.send(dto)).rejects.toThrow(
        'E-mail not sent: Credenciais de email não configuradas',
      );

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('should throw wrapped error if verify fails', async () => {
      mockConfigService.get.mockReturnValue('valid_value');

      mockTransporter.verify.mockRejectedValue(new Error('Connection Failed'));

      await expect(service.send(dto)).rejects.toThrow(
        'E-mail not sent: Connection Failed',
      );
    });

    it('should throw wrapped error if sendMail fails', async () => {
      mockConfigService.get.mockReturnValue('valid_value');
      mockTransporter.verify.mockResolvedValue(true);

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.send(dto)).rejects.toThrow(
        'E-mail not sent: SMTP Error',
      );
    });
  });
});
