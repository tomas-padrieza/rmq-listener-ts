import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  rabbitmq: z.object({
    host: z.string(),
    port: z.coerce.number(),
    username: z.string(),
    password: z.string(),
    vhost: z.string(),
    exchange: z.string(),
    topics: z.array(z.string()),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const config = configSchema.parse({
    rabbitmq: {
      host: process.env.RABBITMQ_HOST,
      port: process.env.RABBITMQ_PORT,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
      vhost: process.env.RABBITMQ_VHOST,
      exchange: process.env.RABBITMQ_EXCHANGE,
      topics: process.env.RABBITMQ_TOPICS?.split(',') || [],
    },
  });

  return config;
}
