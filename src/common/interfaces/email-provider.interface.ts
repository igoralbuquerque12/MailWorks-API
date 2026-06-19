export interface EmailPayload {
  to: string;
  subject: string;
  content: string;
}

export interface EmailSendResult {
  messageId?: string;
}

export interface IEmailProvider {
  /**
   * Sends an already-rendered email through an external delivery provider.
   */
  send(payload: EmailPayload): Promise<EmailSendResult>;
}
