import { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { EmailJobMessage } from 'src/aws/sqs-message.types';
import { EmailWorkerService } from 'src/workers/email-worker.service';
import { WorkersModule } from 'src/workers/workers.module';

let workerService: EmailWorkerService | null = null;

async function getWorkerService(): Promise<EmailWorkerService> {
  if (!workerService) {
    const app = await NestFactory.createApplicationContext(WorkersModule, {
      logger: ['error', 'warn', 'log'],
    });
    workerService = app.get(EmailWorkerService);
  }
  return workerService!;
}

/**
 * Processes SQS records independently and reports only failed message IDs.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const service = await getWorkerService();
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  // ToDo: processamento aqui é sequencial, isso significa que se cada job demorar 10 seg pra processar, vai demorar 50 seg. Se colocar Promisse.all o processamento fica paralelo, e se o job mais lento demorar 10 seg, o processamento total vai ser de 10 seg, pois os jobs vão processar em paralelo. O risco disso é que se tiver muitos jobs, pode sobrecarregar o banco de dados ou outros recursos. Então tem que pensar na escalabilidade e nos limites do sistema. (mas colocando promisse.all o tempo vai ser praticamente o tempo do job mais lento)
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body) as EmailJobMessage;
      console.log(
        JSON.stringify({
          event: 'email_worker_received_message',
          messageId: record.messageId,
          jobId: body.jobId,
          receiveCount: record.attributes.ApproximateReceiveCount ?? '1',
        }),
      );
      await service.processJob({
        jobId: body.jobId,
        correlationId: body.correlationId,
        receiveCount: Number(record.attributes.ApproximateReceiveCount ?? '1'),
      });
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
