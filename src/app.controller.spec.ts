import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns service health metadata', () => {
    const result = new AppController().healthCheck();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('mailworks-api');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});
