/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'redis'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  TEST_DB_HOST: Env.schema.string({ format: 'host' }),
  TEST_DB_PORT: Env.schema.number(),
  TEST_DB_USER: Env.schema.string(),
  TEST_DB_PASSWORD: Env.schema.string.optional(),
  TEST_DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
  GOOGLE_CLIENT_ID: Env.schema.string(),
  GOOGLE_CLIENT_SECRET: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring email (Resend)
  |----------------------------------------------------------
  */
  RESEND_API_KEY: Env.schema.string(),
  EMAIL_FROM_ADDRESS: Env.schema.string(),
  EMAIL_FROM_NAME: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring file uploads
  |----------------------------------------------------------
  */
  UPLOADS_DISK: Env.schema.enum(['local', 's3'] as const),
  UPLOADS_MAX_SIZE: Env.schema.number(),
  UPLOADS_ALLOWED_MIMES: Env.schema.string(),

  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),
  AWS_BUCKET: Env.schema.string.optional(),
  AWS_ENDPOINT: Env.schema.string.optional(),
})
