FROM amazon/aws-lambda-nodejs:16

WORKDIR ${LAMBDA_TASK_ROOT}

COPY package.json server.js ./
RUN npm install

CMD ["server.handler"]