import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appSecrets = this.getSecrets();

    const vpc = this.setupVpc();

    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    vpc.addInterfaceEndpoint("EcrDockerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });

    vpc.addInterfaceEndpoint("EcrApiEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
    });

    vpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });

    const db = this.createDB(vpc);

    const cluster = this.createCluster(vpc);

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: ["*"], // tighten later
      }),
    );

    const documindService = this.createApi(cluster, appSecrets, taskRole);

    const worker = this.createWorker(cluster, taskRole, appSecrets);

    documindService.targetGroup.configureHealthCheck({
      path: "/ping",
      port: "3001",
    });

    db.connections.allowFrom(
      documindService.service.connections,
      ec2.Port.tcp(5432),
    );
    db.connections.allowFrom(worker.connections, ec2.Port.tcp(5432));
    new cdk.CfnOutput(this, "DBEndpoint", {
      value: db.instanceEndpoint.hostname,
    });
  }

  setupVpc() {
    return new ec2.Vpc(this, "RagVpc", {
      maxAzs: 2,
      natGateways: 0,
    });
  }

  getSecrets() {
    return secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecret",
      "documind-env-vars",
    );
  }

  createDB(vpc: ec2.Vpc) {
    return new rds.DatabaseInstance(this, "PostgresDB", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      vpc,
      databaseName: "documind",
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },

      credentials: rds.Credentials.fromGeneratedSecret("postgres"),

      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),

      allocatedStorage: 20,
      maxAllocatedStorage: 100,

      publiclyAccessible: false,
    });
  }

  createCluster(vpc: ec2.Vpc) {
    return new ecs.Cluster(this, "RagCluster", {
      vpc,
    });
  }

  createApi(
    cluster: ecs.ICluster,
    appSecret: secretsmanager.ISecret,
    role: iam.Role,
  ) {
    return new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "ApiService",
      {
        cluster,
        cpu: 256,
        memoryLimitMiB: 512,
        enableExecuteCommand: true,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset("../api", {
            file: "dockerfile.server",
            platform: ecrAssets.Platform.LINUX_AMD64,
          }),
          taskRole: role,
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: "documind",
          }),
          containerPort: 3001,
          secrets: {
            DATABASE_URL: ecs.Secret.fromSecretsManager(
              appSecret,
              "DATABASE_URL",
            ),
            DATABASE_USER: ecs.Secret.fromSecretsManager(
              appSecret,
              "DATABASE_USER",
            ),
            AWS_REGION: ecs.Secret.fromSecretsManager(appSecret, "AWS_REGION"),
            AWS_S3_BUCKET: ecs.Secret.fromSecretsManager(
              appSecret,
              "AWS_S3_BUCKET",
            ),
            REDIS_HOST: ecs.Secret.fromSecretsManager(appSecret, "REDIS_HOST"),
            REDIS_PORT: ecs.Secret.fromSecretsManager(appSecret, "REDIS_PORT"),
            REDIS_PASSWORD: ecs.Secret.fromSecretsManager(
              appSecret,
              "REDIS_PASSWORD",
            ),
            GEMENI_API_KEY: ecs.Secret.fromSecretsManager(
              appSecret,
              "GEMENI_API_KEY",
            ),
          },
        },

        publicLoadBalancer: true,
        assignPublicIp: true,
      },
    );
  }

  createWorker(
    cluster: ecs.ICluster,
    role: iam.Role,
    appSecret: secretsmanager.ISecret,
  ) {
    const workerTaskDef = new ecs.FargateTaskDefinition(this, "WorkerTaskDef", {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole: role, // same IAM role (for S3 etc.)
    });

    workerTaskDef.addContainer("WorkerContainer", {
      image: ecs.ContainerImage.fromAsset("../api", {
        file: "dockerfile.worker",
        platform: ecrAssets.Platform.LINUX_AMD64,
      }),

      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "worker",
      }),

      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(appSecret, "DATABASE_URL"),

        REDIS_HOST: ecs.Secret.fromSecretsManager(appSecret, "REDIS_HOST"),
        REDIS_PORT: ecs.Secret.fromSecretsManager(appSecret, "REDIS_PORT"),
        REDIS_PASSWORD: ecs.Secret.fromSecretsManager(
          appSecret,
          "REDIS_PASSWORD",
        ),

        AWS_REGION: ecs.Secret.fromSecretsManager(appSecret, "AWS_REGION"),
        AWS_S3_BUCKET: ecs.Secret.fromSecretsManager(
          appSecret,
          "AWS_S3_BUCKET",
        ),
        GEMENI_API_KEY: ecs.Secret.fromSecretsManager(
          appSecret,
          "GEMENI_API_KEY",
        ),
      },
    });

    return new ecs.FargateService(this, "WorkerService", {
      cluster,
      enableExecuteCommand: true,
      taskDefinition: workerTaskDef,
      desiredCount: 1,
      assignPublicIp: true,
    });
  }
}
