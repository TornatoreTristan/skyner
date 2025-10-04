import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  // Modification sur la definition du ma base de données avec mon environnement
  connection: env.get('NODE_ENV') === 'test' ? 'test' : 'postgres',

  // Ajout d'une connexion à la BDD test
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },

    test: {
      client: 'pg',
      connection: {
        host: env.get('TEST_DB_HOST'),
        port: env.get('TEST_DB_PORT'),
        user: env.get('TEST_DB_USER'),
        password: env.get('TEST_DB_PASSWORD'),
        database: env.get('TEST_DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
