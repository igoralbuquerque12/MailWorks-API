export interface EmailJobMessage {
  jobId: string;
  tenantId: string;
  providerId: string;
  campaignId: string | null;
  correlationId: string;
  eventType: 'EMAIL_JOB_CREATED';
  createdAt: string;
}
