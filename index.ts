import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";


const prefix = 'lighthouse-server';

class RootStack extends cdk.Stack {
  constructor(app: cdk.App, name: string, props?: cdk.StackProps) {
    super(app, name, props);
    const vpc = new ec2.Vpc(this, `${prefix}-vpc`, {
      cidr: "10.0.0.0/16",
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "ingress",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "compute",
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: 28,
          name: "rds",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const kmsKey = new kms.Key(this, 'MyKey', {
      enableKeyRotation: true,
    });

    const credentials = new rds.DatabaseSecret(this, `${prefix}-db-credentials`, {
      secretName: `${prefix}/db-credentials`,
      username: 'lh_user',
    });

    const database = new rds.ServerlessCluster(this, `${prefix}-database-cluster`, {
      vpc,
      vpcSubnets:  { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_10_11 }),
      credentials: rds.Credentials.fromSecret(credentials),
      defaultDatabaseName: 'lighthouse',
      storageEncryptionKey: kmsKey,
    });

    const lambdaFn = new NodejsFunction(this, `${prefix}-lambda`, {
      bundling: {
        externalModules: ["tedious", "pg-native"]
      },
      entry: path.join(__dirname, 'server.ts'),
      depsLockFilePath: path.join(__dirname, "package-lock.json"),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'handler',
    });

    database.connections.allowFrom(lambdaFn, ec2.Port.tcp(database.clusterEndpoint.port));
    credentials.grantRead(lambdaFn);
    const api = new apiGateway.LambdaRestApi(this, `${prefix}-api-gateway`, {
      handler: lambdaFn,
      proxy: true,
    })

    new cdk.CfnOutput(this, `${prefix}-api-gateway-url`, {
      value: api.url,
    });
  }
}

const app = new cdk.App();
new RootStack(app, `${prefix}-stack`);
