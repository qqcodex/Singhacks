// knexfile.js
// Knex configuration for RM_AI_Assistant (SQL Server)

require('dotenv').config();

module.exports = {
  development: {
    client: 'mssql',
    connection: {
      server: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 1433,
      database: process.env.DB_NAME || 'RM_AI_Assistant',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || '',
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  staging: {
    client: 'mssql',
    connection: {
      server: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 1433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'mssql',
    connection: {
      server: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 1433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    },
    pool: { min: 2, max: 20 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },
};