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
import { LambdaApplication } from "@aws-cdk/aws-codedeploy";
import config from '../config';
import { Aws } from "@aws-cdk/core";

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

        this.lambda = new lambda.Function(this, `Laravel_Lambda`, {
            description: `Generated on: ${new Date().toISOString()}`,
            runtime: lambda.Runtime.PROVIDED,
            handler: 'public/index.php',
            code: lambda.Code.fromAsset(path.resolve(__dirname, `../laravel`), {
                exclude: [
                    'vendor/**',
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
            environment: { // will probably use these for laravel too
                // APP_STORAGE: '/tmp',
                // LOG_CHANNEL: 'stderr',
                // SESSION_DRIVER: 'array',
                // VIEW_COMPILED_PATH: '/tmp/storage/framework/views',
                MY_VARIABLE: 'test',
                WORDPRESS_DB_ENDPOINT: props.rdsEndpoint,
                WORDPRESS_DB_PORT: props.rdsPort,
                WORDPRESS_DB_NAME: props.rdsDb,
                WORDPRESS_DB_USERNAME: props.rdsCredentials.username,
                WORDPRESS_DB_PASSWORD: props.rdsCredentials.secret ? props.rdsCredentials.secret.toString() : '', // empty string might be wrong here
            },
        });
        console.log(this.lambda);

        // lambdaversion
        const version = this.lambda.addVersion(new Date().toISOString());
        const alias = new lambda.Alias(this, `${config.appName}_VersionAlias`, {
            aliasName: 'Prod',
            version,
        });

        console.log('alias');
        console.log(alias);

        // codedeploy
        const temp = new codedeploy.LambdaDeploymentGroup(this, `${config.appName}_DeploymentGroup`, {
            alias,
            deploymentConfig: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
        });

        console.log('codedeploy');
        console.log(temp)

        // ApiGW
        const apigw = new apigateway.LambdaRestApi(this, `${config.appName}_APIGateway`, {
            handler: this.lambda,
            proxy: true
        });

        console.log('apigw');
        console.log(apigw);

        // CF
        props.s3.grantRead(props.oai); // must be granted explicitly
        const temp2 = new CloudFrontWebDistribution(this, `${config.appName}_Cloudfront`, {
            defaultRootObject: "index.php",
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: props.s3,
                        originAccessIdentity: props.oai,
                    },
                    behaviors: [
                        {
                            pathPattern: "/public/assets/*"
                        },
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
                            headers: ['*']
                        },
                        minTtl: cdk.Duration.seconds(0),
                        maxTtl: cdk.Duration.seconds(0),
                        defaultTtl: cdk.Duration.seconds(0),
                    }]
                }
            ],
            enableIpV6: true,
        });
        console.log('cloudfront');
        console.log(temp2);
    }
}
