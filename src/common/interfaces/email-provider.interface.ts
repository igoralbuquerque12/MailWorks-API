export interface EmailPayload {
  to: string;
  subject: string;
  content: string;
}

export interface IEmailProvider {
  send(payload: EmailPayload): Promise<void>;
}
