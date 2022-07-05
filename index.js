const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const kms = require("aws-cdk-lib/aws-kms");
const rds = require("aws-cdk-lib/aws-rds");
const apiGateway = require("aws-cdk-lib/aws-apigateway");
const { NodejsFunction } = require("aws-cdk-lib/aws-lambda-nodejs");
const lambda = require("aws-cdk-lib/aws-lambda");
const path = require("path");


const prefix = 'lighthouse-server';

class RootStack extends cdk.Stack {
  constructor(app, name, props) {
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

    // const database = new rds.DatabaseInstance(this, `${prefix}-database`, {
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    //   credentials: rds.Credentials.= require(ecret(credentials),
    //   vpc,
    //   databaseName: `lighthouse`,
    //   engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_14_2 }),
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    //   preferredBackupWindow: "02:00-03:00",
    //   preferredMaintenanceWindow: "Sun:03:00-Sun:04:00",
    //   storageEncrypted: true,
    //   storageEncryptionKey: kmsKey,
    //   removalPolicy:  cdk.RemovalPolicy.DESTROY,
    //   backupRetention: cdk.Duration.days(0),
    // })

    const lambdaFn = new NodejsFunction(this, `${prefix}-lambda`, {
      entry: path.join(__dirname, './server.js'),
      depsLockFilePath: path.join(__dirname, "./package-lock.json"),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'handler',
      environment: {
        SECRET_NAME: credentials.secretName,
      }
    });

    database.connections.allowFrom(lambdaFn, ec2.Port.tcp(database.clusterEndpoint.port));
    credentials.grantRead(lambdaFn);
    new apiGateway.LambdaRestApi(this, `${prefix}-api-gateway`, {
      handler: lambdaFn,
      proxy: true,
    })
  }
}

const app = new cdk.App();
new RootStack(app, `${prefix}-stack`);
app.synth()