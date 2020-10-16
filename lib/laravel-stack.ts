import { StackProps, Stack, Construct, Arn, Duration, CfnOutput } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as codedeploy from "@aws-cdk/aws-codedeploy";
import * as apigateway from "@aws-cdk/aws-apigateway";
import { CloudFrontWebDistribution, OriginAccessIdentity, CloudFrontAllowedMethods } from "@aws-cdk/aws-cloudfront"
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from '@aws-cdk/aws-ec2'
import { Credentials } from '@aws-cdk/aws-rds';
import * as path from "path";
import * as s3 from "@aws-cdk/aws-s3";
import * as efs from '@aws-cdk/aws-efs';
import { Queue } from '@aws-cdk/aws-sqs';
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import config from '../config';

interface ApplicationStackProps extends StackProps {
    vpc: Vpc;
    databaseAccessSecurityGroup: SecurityGroup
    efsAccessSecurityGroup: SecurityGroup
    rdsEndpoint: string
    rdsDb: string
    rdsPort: string,
    rdsCredentials: Credentials,
    efs: efs.FileSystem
    s3: s3.Bucket
    oai: OriginAccessIdentity
}

export class LaravelStack extends Stack {
    readonly lambda: lambda.Function;
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

            // LOG_CHANNEL: 'stack', // do i need this?

            DB_CONNECTION: 'mysql',
            DB_HOST: '127.0.0.1',
            DB_PORT: '3306',
            DB_DATABASE: 'laravel',
            DB_USERNAME: 'root',
            DB_PASSWORD: '',

            // BROADCAST_DRIVER: 'log',
            // CACHE_DRIVER: env.CACHE_DRIVER,
            // QUEUE_CONNECTION: env.QUEUE_CONNECTION,
            // SESSION_DRIVER: env.SESSION_DRIVER,
            // SESSION_LIFETIME: env.SESSION_LIFETIME,

            // REDIS_HOST: env.REDIS_HOST,
            // REDIS_PASSWORD: env.REDIS_PASSWORD,
            // REDIS_PORT: env.REDIS_PORT,

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


            // PUSHER_APP_ID: env.PUSHER_APP_ID ? env.PUSHER_APP_ID : '',
            // PUSHER_APP_KEY: env.PUSHER_APP_KEY ? env.PUSHER_APP_KEY : '',
            // PUSHER_APP_SECRET: env.PUSHER_APP_SECRET ? env.PUSHER_APP_SECRET : '',
            // PUSHER_APP_CLUSTER: env.PUSHER_APP_CLUSTER,

            // MIX_PUSHER_APP_KEY: env.MIX_PUSHER_APP_KEY,
            // MIX_PUSHER_APP_CLUSTER: env.MIX_PUSHER_APP_CLUSTER,

            // remove this
            WORDPRESS_DB_ENDPOINT: props.rdsEndpoint,
            WORDPRESS_DB_PORT: props.rdsPort,
            WORDPRESS_DB_NAME: props.rdsDb,
            WORDPRESS_DB_USERNAME: props.rdsCredentials.username,
            WORDPRESS_DB_PASSWORD: props.rdsCredentials.secret ? props.rdsCredentials.secret.toString() : '', // empty string might be wrong here
        }

        this.lambda = new lambda.Function(this, `${config.appName}_Lambda`, {
            description: `Generated on: ${new Date().toISOString()}`,
            runtime: lambda.Runtime.PROVIDED,
            handler: 'public/index.php',
            code: lambda.Code.fromAsset(path.resolve(__dirname, `../${config.appDir}`), {
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
            timeout: Duration.seconds(28),
            memorySize: 1024,
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE },
            filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup],
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'php-74-fpm', Arn.format({
                    partition: 'aws',
                    service: 'lambda',
                    account: '209497400698', // the bref.sh account
                    resource: 'layer',
                    sep: ':',
                    resourceName: 'php-74-fpm:11',
                }, this)),
            ],
            environment
        });

        // lambdaversion
        const version = this.lambda.addVersion(new Date().toISOString());
        const alias = new lambda.Alias(this, `${config.appName}_VersionAlias`, {
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
            handler: this.lambda,
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
            retentionPeriod: Duration.days(14),
        });

        const queue = new Queue(this, `${config.appName}_Queue`, {
            queueName: `${config.appName}_queue`,
            deadLetterQueue: {
                maxReceiveCount: 1,
                queue: deadLetterQueue
            }
        });

        // todo: grant send messages to deadletter queue too
        queue.grantConsumeMessages(this.lambda);
        queue.grantSendMessages(this.lambda);

        this.lambda.addEventSource(
            new SqsEventSource(queue, {
                batchSize: 10
            })
        )
        // Add these to output for postbuild script to use
        new CfnOutput(this, 'env', {
            value: JSON.stringify({
                AWS_URL: this.cloudfront.distributionDomainName,
                SQS_QUEUE: queue.queueName,
                SQS_PREFIX: queue.queueUrl.replace(queue.queueName, '')
            })
        });
        new CfnOutput(this, 'functionName', {
            value: this.lambda.functionName
        });
    }
}
