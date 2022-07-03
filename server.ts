import serverless from 'serverless-http';
//@ts-ignore
import { createApp } from '@lhci/server';

let server: serverless.Handler;

const databaseSecret = JSON.parse(process.env.DB_SECRET || "");
const { hostname, username, password, dbname, port } = databaseSecret;

export async function handler(event: any, context: any) {
  if (server) return server(event, context);
  const { app } = await createApp({
    storage: {
      storageMethod: 'sql',
      sqlDialect: 'postgres',
      sqlConnectionSsl: true,
      sqlConnectionUrl: `postgresql://${username}:${password}@${hostname}:${port}/${dbname}`,
      sqlDialectOptions: {
        ssl: true,
      },
    }
  });
  server = serverless(app);
  const result = await server(event, context);
  return result;
}
