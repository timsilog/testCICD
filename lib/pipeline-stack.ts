import * as cdk from "@aws-cdk/core";
import { App, Duration, Stack, StackProps, SecretValue } from "@aws-cdk/core";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "@aws-cdk/aws-ec2";
import * as efs from "@aws-cdk/aws-efs";
import { CodeBuildAction, GitHubSourceAction, GitHubTrigger } from "@aws-cdk/aws-codepipeline-actions/lib";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import { PipelineProject, BuildSpec, FileSystemLocation, LinuxBuildImage } from "@aws-cdk/aws-codebuild/lib";
import * as s3 from "@aws-cdk/aws-s3";
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';
import { Role, PolicyStatement, Effect, ManagedPolicy, ServicePrincipal, CompositePrincipal } from "@aws-cdk/aws-iam";
import { ISecret, Secret, SecretStringGenerator } from "@aws-cdk/aws-secretsmanager";
import { load } from "ts-dotenv";
import { PolicyDocument } from "@aws-cdk/aws-iam/lib";
import config from '../config';

const env = load({
    GITHUB_TOKEN: String
});

export interface PipelineStackProps extends StackProps {
    // wordpressArn: string,
    s3: s3.Bucket,
    vpc: Vpc,
    efs: efs.FileSystem,
    cloudfront: CloudFrontWebDistribution
    databaseAccessSecurityGroup: SecurityGroup
    efsAccessSecurityGroup: SecurityGroup
    egressSecurityGroup: SecurityGroup
    rdsEndpoint: string
    rdsDb: string
    laravelArn: string,
    rdsArn: string,
    rdsSecret: ISecret,
    rdsPort: string,
    //lambda: lambda.Function,
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);

        const sourceOutput = new codepipeline.Artifact();
        const lambdaBuildOutput = new codepipeline.Artifact('LambdaBuildOutput');

        const codePipelineServicePrincipal = new ServicePrincipal('codepipeline.amazonaws.com');
        const codePipelineUser = new Role(this, 'codePipelineUser2', {
            roleName: 'codePipelineUser2',
            assumedBy: codePipelineServicePrincipal,
            inlinePolicies: {
                cloudformations: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'cloudformation:DescribeStacks',
                            ]
                        }),
                    ],
                }),

            },
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
            ]
        });

        const codeBuildServicePrincipal = new ServicePrincipal('codebuild.amazonaws.com');
        const codeBuildUser = new Role(this, 'codeBuildUser2', {
            roleName: 'codeBuildUser2',
            assumedBy: codeBuildServicePrincipal,
            inlinePolicies: {
                cloudformations: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            // resources: [props.wordpressArn + '*'],
                            resources: ['*'],
                            actions: [
                                'cloudformation:*',
                            ]
                        }),
                    ]
                }),
                cloudfront: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: ['*'],
                            //resources: [props.cloudfront + '*'],
                            actions: [
                                'cloudfront:GetDistribution',
                            ]
                        }),
                    ]
                }),
                rds: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: [props.rdsArn],
                            actions: [
                                'rds:DescribeDBInstances'
                            ]
                        })
                    ]
                }),
                iam: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'iam:GetRole',
                                // todo
                                'iam:PassRole'
                            ]
                        })
                    ]
                }),
                secrets: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: [props.rdsSecret.secretArn],
                            actions: [
                                'secretsmanager:GetSecretValue'
                            ]
                        })
                    ]
                }),
                lambda: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'cloudwatch:DescribeAlarms',
                                'lambda:GetFunction',
                                'lambda:DeleteFunction',
                                'lambda:UpdateFunctionCode',
                                'lambda:UpdateFunctionConfiguration',
                                'lambda:ListVersionsByFunction',
                                'lambda:PublishVersion',
                                'lambda:UpdateAlias',
                                'lambda:GetAlias',
                                'lambda:GetProvisionedConcurrencyConfig'
                            ]
                        })
                    ]
                }),
                codedeploy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'codedeploy:CreateDeployment',
                                'codedeploy:GetDeployment',
                                'codedeploy:GetDeploymentConfig',
                                'codedeploy:RegisterApplicationRevision'
                            ]
                        })
                    ]
                }),

            },
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
            ]
        });

        // Build Lambda
        const lambdaBuild = new PipelineProject(this, "LambdaBuild", {
            role: codeBuildUser,
            vpc: props.vpc,
            buildSpec: BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        'runtime-versions': {
                            php: 7.4
                        },
                        commands: [
                            // 'npm i -g aws-cdk serverless',
                            'npm i',
                            'cd laravel',
                            'composer install && npm i && npm run prod && cd ../',
                        ]
                    },
                    build: {
                        commands: [
                            "npm run build",
                            `aws s3 sync laravel/public/assets s3://${props.s3.bucketName} --exclude *.php`,
                            // "serverless deploy"
                        ]
                    },
                },
                artifacts: {
                    "base-directory": "laravel",
                    files: [
                        "**/*"
                    ]
                }
            }),
            fileSystemLocations: [
                FileSystemLocation.efs({
                    identifier: config.appName + "_codebuild_efs_location",
                    location: props.efs.fileSystemId + '.efs.' + props.vpc.env.region + '.amazonaws.com' + ':' + '/',
                    mountPoint: '/mnt/efs',
                    mountOptions: 'nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport',
                })
            ],
            environment: {
                buildImage: LinuxBuildImage.STANDARD_4_0,
                privileged: true,
            },
            environmentVariables: {
                GITHUB_TOKEN: { value: env.GITHUB_TOKEN }
            },
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup, props.egressSecurityGroup]
        });


        // Deploy Assets
        const deploy = new PipelineProject(this, config.appName + "_deploy", {
            role: codeBuildUser,
            vpc: props.vpc,
            buildSpec: BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        "runtime-versions": {
                            php: 7.4
                        },
                        commands: [
                            'npm i -g aws-cdk',
                            'npm i',
                            // 'apt-get update && apt-get install -y mysql-client zip',
                            // 'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
                            // 'chmod +x wp-cli.phar',
                            // 'mv wp-cli.phar /usr/local/bin/wp',
                        ]
                    },
                    build: {
                        commands: [
                            'npm run build',
                            // 'cd wordpress/wp-core',
                            // 'wp core install --url=https://' + props.cloudfront.distributionDomainName + ' --title="Lambda POC" --admin_name=' + config.wordpressAdminUser + ' --admin_password=' + config.wordpressAdminPassword + ' --admin_email=' + config.wordpressAdminEmail + ' --allow-root',
                            // 'wp rewrite structure "/%year%/%monthnum%/%postname%/" --allow-root',
                            // 'cd ../../',
                            // `aws s3 sync wordpress/wp-core s3://${props.s3.bucketName}/assets --exact-timestamps --quiet --exclude '*' --include "*.js" --include "*.css" --include "*.gif" --include "*.jpg" --include "*.png" --delete`,
                            // "zip -r bundle.zip ./wordpress/wp-core",
                            // "mv bundle.zip /mnt/efs/bundle.zip",
                            "cdk deploy Laravel --exclusively"
                        ]
                    },
                },
                artifacts: {
                    files: [
                        "**/*"
                    ]
                }
            }),
            fileSystemLocations: [
                FileSystemLocation.efs({
                    identifier: config.appName + "_codebuild_efs_location",
                    location: props.efs.fileSystemId + '.efs.' + props.vpc.env.region + '.amazonaws.com' + ':' + '/',
                    mountPoint: '/mnt/efs',
                    mountOptions: 'nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport',
                })
            ],
            environment: {
                buildImage: LinuxBuildImage.STANDARD_4_0,
                privileged: true,
            },
            environmentVariables: {
                GITHUB_TOKEN: { value: env.GITHUB_TOKEN }
            },
            securityGroups: [props.databaseAccessSecurityGroup, props.efsAccessSecurityGroup, props.egressSecurityGroup]
        });

        new codepipeline.Pipeline(this, 'Pipeline2', {
            role: codePipelineUser,
            restartExecutionOnUpdate: true,
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new GitHubSourceAction({
                            actionName: 'Checkout',
                            output: sourceOutput,
                            owner: "timsilog",
                            repo: "testCICD",
                            oauthToken: SecretValue.plainText(env.GITHUB_TOKEN),
                            trigger: GitHubTrigger.WEBHOOK,
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new CodeBuildAction({
                            actionName: 'Lambda_Build',
                            project: lambdaBuild,
                            input: sourceOutput,
                            outputs: [lambdaBuildOutput],
                        }),
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new CodeBuildAction({
                            actionName: 'Deploy',
                            project: deploy,
                            input: lambdaBuildOutput,
                        }),
                    ],
                },
            ],
        });
    }
}
