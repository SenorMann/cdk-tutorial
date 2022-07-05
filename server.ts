// import AWS from "aws-sdk";
import serverless from 'serverless-http';
import express from "express";
//@ts-ignore
// import { createApp } from '@lhci/server';

// let server: serverless.Handler;
// const secrets = new AWS.SecretsManager({});
// const secretName = process.env.SECRET_NAME;


// export async function handler(event: any, context: any) {
//   if (server) return server(event, context);
//   // @ts-ignore
//   const { host, port, dbname, username, password } = await getSecretValue(secretName);
//   const { app } = await createApp({
//     storage: {
//       storageMethod: 'sql',
//       sqlDialect: 'postgres',
//       sqlConnectionSsl: true,
//       sqlConnectionUrl: `postgresql://${username}:${password}@${host}:${port}/${dbname}`,
//       sqlDialectOptions: {
//         ssl: true,
//       },
//     }
//   });
//   server = serverless(app);
//   const result = await server(event, context);
//   return result;
// }


// function getSecretValue(secretId: string) {
//   return new Promise((resolve, reject) => {
//     secrets.getSecretValue({ SecretId: secretId }, (err, data) => {
//       if (err) return reject(err);
//       // @ts-ignore
//       return resolve(JSON.parse(data.SecretString));
//     });
//   });
// }
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'What\'s up fool??!!!' });
})

export const handler = serverless(app);
