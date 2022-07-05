const AWS = require("aws-sdk");
const { createApp } = require('@lhci/server');
const serverless = require('serverless-http');

let server;
const secrets = new AWS.SecretsManager({});
const secretName = process.env.SECRET_NAME;


exports.handler = async (event, context, callback) => {
  try {
    if (server) return server(event, context);

    const { host, port, dbname, username, password } = await getSecretValue(secretName);
    const { app } = await createApp({
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'postgres',
        sqlConnectionSsl: true,
        sqlConnectionUrl: `postgresql://${username}:${password}@${host}:${port}/${dbname}`,
        sqlDialectOptions: {
          ssl: true,
        },
      }
    });
    server = serverless(app);
    const result = await server(event, context);
    return result;
  } catch (err) {
    console.error(err);
    callback(err);
  }
}


function getSecretValue(secretId) {
  return new Promise((resolve, reject) => {
    secrets.getSecretValue({ SecretId: secretId }, (err, data) => {
      if (err) return reject(err);
      return resolve(JSON.parse(data.SecretString));
    });
  });
}
