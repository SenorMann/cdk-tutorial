const AWS = require("aws-sdk");
const { createApp } = require('@lhci/server');
const serverless = require('serverless-http');

let handler;
const secrets = new AWS.SecretsManager({});
const secretName = process.env.SECRET_NAME;

exports.handler = async (event, context, callback) => {
  try {
    if (!handler) {
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
    handler = serverless(app);
  }
  const response = await handler(event, context);
  return response;
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
