import * as cdk from "@aws-cdk/core";
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
// import { LambdaApplication } from "@aws-cdk/aws-codedeploy";
import config from '../config';
// import { Aws } from "@aws-cdk/core";
// import { load } from "ts-dotenv";


// const env = load({
//     APP_NAME: String,
//     APP_ENV: String,
//     APP_KEY: String,
//     APP_DEBUG: String,
//     APP_URL: String,

//     LOG_CHANNEL: String,

//     DB_CONNECTION: String,
//     DB_HOST: String,
//     DB_PORT: String,
//     DB_DATABASE: String,
//     DB_USERNAME: String,
//     // DB_PASSWORD: String,

//     BROADCAST_DRIVER: String,
//     CACHE_DRIVER: String,
//     QUEUE_CONNECTION: String,
//     SESSION_DRIVER: String,
//     SESSION_LIFETIME: String,

//     REDIS_HOST: String,
//     REDIS_PASSWORD: String,
//     REDIS_PORT: String,

//     MAIL_MAILER: String,
//     MAIL_HOST: String,
//     MAIL_PORT: String,
//     MAIL_USERNAME: String,
//     MAIL_PASSWORD: String,
//     MAIL_ENCRYPTION: String,
//     MAIL_FROM_ADDRESS: String,
//     MAIL_FROM_NAME: String,

//     // AWS_ACCESS_KEY_ID: String,
//     // AWS_SECRET_ACCESS_KEY: String,
//     AWS_DEFAULT_REGION: String,
//     AWS_BUCKET: String,
//     AWS_URL: String,

//     // PUSHER_APP_ID: String,
//     // PUSHER_APP_KEY: String,
//     // PUSHER_APP_SECRET: String,
//     // PUSHER_APP_CLUSTER: String,
//     // MIX_PUSHER_APP_KEY: String,
//     // MIX_PUSHER_APP_CLUSTER: String,
// });

interface ApplicationStackProps extends cdk.StackProps {
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

export class LaravelStack extends cdk.Stack {
    readonly lambda: lambda.Function;
    readonly cloudfront: CloudFrontWebDistribution;

    constructor(scope: cdk.Construct, id: string, props: ApplicationStackProps) {
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
            APP_NAME: 'Laravel',
            APP_ENV: 's3',
            APP_KEY: 'base64:lAVEpZv/OI1H7G/OgsDVRCVqD3eWILkmcMWjcIW4uoA=',
            APP_DEBUG: 'true',
            APP_URL: 'http://localhost',

            LOG_CHANNEL: 'stack',

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

            // MAIL_MAILER: env.MAIL_MAILER,
            // MAIL_HOST: env.MAIL_HOST,
            // MAIL_PORT: env.MAIL_PORT,
            // MAIL_USERNAME: env.MAIL_USERNAME,
            // MAIL_PASSWORD: env.MAIL_PASSWORD,
            // MAIL_ENCRYPTION: env.MAIL_ENCRYPTION,
            // MAIL_FROM_ADDRESS: env.MAIL_FROM_ADDRESS,
            // MAIL_FROM_NAME: env.MAIL_FROM_NAME,

            // AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID ? env.AWS_ACCESS_KEY_ID : '',
            // AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY ? env.AWS_SECRET_ACCESS_KEY : '',
            // AWS_DEFAULT_REGION: 'us-east-1',
            AWS_BUCKET: props.s3.bucketName,
            // AWS_URL: 'wrongurl',

            // PUSHER_APP_ID: env.PUSHER_APP_ID ? env.PUSHER_APP_ID : '',
            // PUSHER_APP_KEY: env.PUSHER_APP_KEY ? env.PUSHER_APP_KEY : '',
            // PUSHER_APP_SECRET: env.PUSHER_APP_SECRET ? env.PUSHER_APP_SECRET : '',
            // PUSHER_APP_CLUSTER: env.PUSHER_APP_CLUSTER,

            // MIX_PUSHER_APP_KEY: env.MIX_PUSHER_APP_KEY,
            // MIX_PUSHER_APP_CLUSTER: env.MIX_PUSHER_APP_CLUSTER,

            WORDPRESS_DB_ENDPOINT: props.rdsEndpoint,
            WORDPRESS_DB_PORT: props.rdsPort,
            WORDPRESS_DB_NAME: props.rdsDb,
            WORDPRESS_DB_USERNAME: props.rdsCredentials.username,
            WORDPRESS_DB_PASSWORD: props.rdsCredentials.secret ? props.rdsCredentials.secret.toString() : '', // empty string might be wrong here
        }

        this.lambda = new lambda.Function(this, `Laravel_Lambda`, {
            description: `Generated on: ${new Date().toISOString()}`,
            runtime: lambda.Runtime.PROVIDED,
            handler: 'public/index.php',
            code: lambda.Code.fromAsset(path.resolve(__dirname, `../laravel`), {
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
            timeout: cdk.Duration.seconds(28),
            memorySize: 1024,
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE },
            filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup],
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'php-74-fpm', cdk.Arn.format({
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
                        minTtl: cdk.Duration.seconds(0),
                        maxTtl: cdk.Duration.seconds(0),
                        defaultTtl: cdk.Duration.seconds(0),
                    }]
                }
            ],
            enableIpV6: true,
        });

        new cdk.CfnOutput(this, 'cfDomainName', {
            value: this.cloudfront.distributionDomainName
        });
        new cdk.CfnOutput(this, 'functionName', {
            value: this.lambda.functionName
        });
    }
}
