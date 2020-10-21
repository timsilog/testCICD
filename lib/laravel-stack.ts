import { StackProps, Stack, Construct, Arn, Duration, CfnOutput } from "@aws-cdk/core";
import { Function, Code, FileSystem, LayerVersion, Runtime, Alias } from "@aws-cdk/aws-lambda";
import * as codedeploy from "@aws-cdk/aws-codedeploy";
import * as apigateway from "@aws-cdk/aws-apigateway";
import { CloudFrontWebDistribution, OriginAccessIdentity, CloudFrontAllowedMethods } from "@aws-cdk/aws-cloudfront"
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { InterfaceVpcEndpointAwsService, Peer, Port, SecurityGroup, SubnetType, Vpc } from '@aws-cdk/aws-ec2'
import { Credentials } from '@aws-cdk/aws-rds';
import * as path from "path";
import * as s3 from "@aws-cdk/aws-s3";
import * as efs from '@aws-cdk/aws-efs';
import { Queue } from '@aws-cdk/aws-sqs';
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import config from '../config';

interface ApplicationStackProps extends StackProps {
    vpc: Vpc,
    databaseAccessSecurityGroup: SecurityGroup,
    efsAccessSecurityGroup: SecurityGroup,
    egressSecurityGroup: SecurityGroup,
    rdsEndpoint: string,
    rdsDb: string,
    rdsPort: string,
    rdsCredentials: Credentials,
    efs: efs.FileSystem,
    s3: s3.Bucket,
    oai: OriginAccessIdentity,
}

export class LaravelStack extends Stack {
    readonly lambdaHttp: Function;
    readonly lambdaWorker: Function;
    readonly cloudfront: CloudFrontWebDistribution;

    constructor(scope: Construct, id: string, props: ApplicationStackProps) {
        super(scope, id, props);

        // create a new access point from the filesystem
        const accessPoint = props.efs.addAccessPoint('AccessPoint', {
            // set /export/lambda as the root of the access point
            path: '/',
            createAcl: {
                ownerUid: '1001',
                ownerGid: '1001',
                permissions: '750',
            },
            // enforce the POSIX identity so lambda function will access with this identity
            posixUser: {
                uid: '1001',
                gid: '1001',
            },
        });

        const environment: any = {
            APP_NAME: config.appName,
            APP_ENV: config.appEnv,
            APP_KEY: config.appKey,
            APP_DEBUG: config.appDebug,
            APP_URL: config.appUrl,

            DB_CONNECTION: 'mysql',
            DB_HOST: '127.0.0.1',
            DB_PORT: '3306',
            DB_DATABASE: 'laravel',
            DB_USERNAME: 'root',
            DB_PASSWORD: '',

            MAIL_MAILER: config.mailMailer,
            MAIL_HOST: config.mailHost,
            MAIL_PORT: config.mailPort,
            MAIL_USERNAME: config.mailUsername,
            // MAIL_PASSWORD: config.mailPassword,
            MAIL_ENCRYPTION: config.mailEncryption,
            MAIL_FROM_ADDRESS: config.mailFromAddress,
            MAIL_FROM_NAME: config.mailFromName,

            // AWS_ACCESS_KEY_ID: provided by lambda
            // AWS_SECRET_ACCESS_KEY: provided by lambda
            // AWS_DEFAULT_REGION: 
            AWS_BUCKET: props.s3.bucketName,
            // AWS_URL: provided by post build script

            QUEUE_CONNECTION: config.queueConnection,
            // SQS_KEY:
            // SQS_SECRET:
            // SQS_QUEUE: Provided by post build script
            // SQS_REGION: Provided by post build script
            // SQS_PREFIX: Provided by post build script


            // remove this
            WORDPRESS_DB_ENDPOINT: props.rdsEndpoint,
            WORDPRESS_DB_PORT: props.rdsPort,
            WORDPRESS_DB_NAME: props.rdsDb,
            WORDPRESS_DB_USERNAME: props.rdsCredentials.username,
            WORDPRESS_DB_PASSWORD: props.rdsCredentials.secret ? props.rdsCredentials.secret.toString() : '', // empty string might be wrong here
        }

        this.lambdaHttp = new Function(this, `${config.appName}_Lambda`, {
            description: `Generated on: ${new Date().toISOString()}`,
            runtime: Runtime.PROVIDED,
            handler: 'public/index.php',
            code: Code.fromAsset(path.resolve(__dirname, `../${config.appDir}`), {
                exclude: [
                    'node_modules/**',
                    'node_modules/.bin/**',
                    'public/assets/**',
                    'public/storage/**',
                    'resources/assets/**',
                    'storage/**',
                    'tests/**',
                ]
            }),
            timeout: Duration.seconds(60),
            memorySize: 1024,
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE },
            filesystem: FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup, props.egressSecurityGroup],
            layers: [
                LayerVersion.fromLayerVersionArn(this, 'php-74-fpm', 'arn:aws:lambda:us-east-1:209497400698:layer:php-74-fpm:14'),
            ],
            environment
        });

        this.lambdaWorker = new Function(this, `${config.appName}_Lambda_Worker`, {
            description: `Worker for SQS. Generated on: ${new Date().toISOString()}`,
            runtime: Runtime.PROVIDED,
            handler: 'worker.php',
            code: Code.fromAsset(path.resolve(__dirname, `../${config.appDir}`), {
                exclude: [
                    'node_modules/**',
                    'node_modules/.bin/**',
                    'public/assets/**',
                    'public/storage/**',
                    'resources/assets/**',
                    'storage/**',
                    'tests/**',
                ]
            }),
            timeout: Duration.seconds(900), // 900 is max; 15 mins
            memorySize: 1024,
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE },
            filesystem: FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup, props.egressSecurityGroup],
            layers: [
                LayerVersion.fromLayerVersionArn(this, 'php-74:14', Arn.format({
                    partition: 'aws',
                    service: 'lambda',
                    account: '209497400698', // the bref.sh account
                    resource: 'layer',
                    sep: ':',
                    resourceName: 'php-74:14',
                }, this)),
            ],
            environment
        });

        // lambdaversion
        const version = this.lambdaHttp.addVersion(new Date().toISOString());
        const alias = new Alias(this, `${config.appName}_VersionAlias`, {
            aliasName: 'Prod',
            version,
        });

        // codedeploy
        new codedeploy.LambdaDeploymentGroup(this, `${config.appName}_DeploymentGroup`, {
            alias,
            deploymentConfig: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
        });

        // ApiGW
        const apigw = new apigateway.LambdaRestApi(this, `${config.appName}_APIGateway`, {
            handler: this.lambdaHttp,
            proxy: true
        });

        // CF
        props.s3.grantRead(props.oai); // must be granted explicitly
        this.cloudfront = new CloudFrontWebDistribution(this, `${config.appName}_Cloudfront`, {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: props.s3,
                        originAccessIdentity: props.oai,
                    },
                    behaviors: [
                        {
                            pathPattern: "js/*"
                        },
                        {
                            pathPattern: "css/*"
                        }
                    ]
                },
                {
                    customOriginSource: {
                        domainName: `${apigw.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
                    },
                    originPath: '/' + apigw.deploymentStage.stageName,
                    behaviors: [{
                        allowedMethods: CloudFrontAllowedMethods.ALL,
                        isDefaultBehavior: true,
                        forwardedValues: {
                            queryString: true,
                            cookies: {
                                forward: 'all'
                            },
                            headers: [
                                'Accept',
                                'Content-Type'
                            ]
                        },
                        minTtl: Duration.seconds(0),
                        maxTtl: Duration.seconds(0),
                        defaultTtl: Duration.seconds(0),
                    }]
                }
            ],
            enableIpV6: true,
        });

        // Send msq to deadletter queue if it doesn't know what to do with a msg
        const deadLetterQueue = new Queue(this, `${config.appName}_Deadletter_Queue`, {
            queueName: `${config.appName}_deadletter_queue`,
            visibilityTimeout: Duration.seconds(900),
            retentionPeriod: Duration.days(14),
        });

        const queue = new Queue(this, `${config.appName}_Queue`, {
            queueName: `${config.appName}_queue`,
            visibilityTimeout: Duration.seconds(900),
            deadLetterQueue: {
                maxReceiveCount: 1,
                queue: deadLetterQueue
            }
        });

        // todo: grant send messages to deadletter queue too
        queue.grantConsumeMessages(this.lambdaWorker);
        queue.grantSendMessages(this.lambdaHttp);

        this.lambdaWorker.addEventSource(
            new SqsEventSource(queue, {
                batchSize: 10
            })
        )

        // const sqsEndpoint = props.vpc.addInterfaceEndpoint('sqs-gateway', {
        //     service: InterfaceVpcEndpointAwsService.SQS,
        // });
        // sqsEndpoint.connections.allowDefaultPortFrom(this.lambdaHttp);

        // Add these to output for postbuild script to use
        new CfnOutput(this, 'env', {
            value: JSON.stringify({
                AWS_URL: this.cloudfront.distributionDomainName,
                SQS_QUEUE: queue.queueUrl,
                SQS_PREFIX: queue.queueUrl.replace(queue.queueName, '')
            })
        });
        new CfnOutput(this, 'httpFunctionName', {
            value: this.lambdaHttp.functionName
        });
        new CfnOutput(this, 'workerFunctionName', {
            value: this.lambdaWorker.functionName
        });
    }
}
