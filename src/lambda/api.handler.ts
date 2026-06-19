import serverlessExpress from '@codegenie/serverless-express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from 'src/app.module';

let cachedHandler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  nestApp.setGlobalPrefix('v1');
  await nestApp.init();

  cachedHandler = serverlessExpress({ app: expressApp });
  return cachedHandler;
}

/**
 * Adapts API Gateway HTTP API events to the cached NestJS Express app.
 */
export const handler: Handler = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return (await bootstrap())(event, context, callback);
};
