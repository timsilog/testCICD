"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStack = void 0;
const cdk = require("@aws-cdk/core");
const core_1 = require("@aws-cdk/core");
const codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
const codepipeline = require("@aws-cdk/aws-codepipeline");
const codebuild = require("@aws-cdk/aws-codebuild");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const ts_dotenv_1 = require("ts-dotenv");
const lib_1 = require("@aws-cdk/aws-iam/lib");
const env = ts_dotenv_1.load({
    GITHUB_TOKEN: String
});
class PipelineStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const sourceOutput = new codepipeline.Artifact();
        const lambdaBuildOutput = new codepipeline.Artifact('LambdaBuildOutput');
        const codePipelineServicePrincipal = new aws_iam_1.ServicePrincipal('codepipeline.amazonaws.com');
        const codePipelineUser = new aws_iam_1.Role(this, 'codePipelineUser2', {
            roleName: 'codePipelineUser2',
            assumedBy: codePipelineServicePrincipal,
            inlinePolicies: {
                cloudformations: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'cloudformation:DescribeStacks',
                            ]
                        }),
                    ],
                }),
            },
            managedPolicies: [
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
            ]
        });
        const codeBuildServicePrincipal = new aws_iam_1.ServicePrincipal('codebuild.amazonaws.com');
        const codeBuildUser = new aws_iam_1.Role(this, 'codeBuildUser2', {
            roleName: 'codeBuildUser2',
            assumedBy: codeBuildServicePrincipal,
            inlinePolicies: {
                cloudformations: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            // resources: [props.wordpressArn + '*'],
                            resources: ['*'],
                            actions: [
                                'cloudformation:*',
                            ]
                        }),
                    ]
                }),
                cloudfront: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            resources: ['*'],
                            //resources: [props.cloudfront + '*'],
                            actions: [
                                'cloudfront:GetDistribution',
                            ]
                        }),
                    ]
                }),
                rds: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            resources: [props.rdsArn],
                            actions: [
                                'rds:DescribeDBInstances'
                            ]
                        })
                    ]
                }),
                iam: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            resources: ['*'],
                            actions: [
                                'iam:GetRole',
                                // todo
                                'iam:PassRole'
                            ]
                        })
                    ]
                }),
                secrets: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
                            resources: [props.rdsSecret.secretArn],
                            actions: [
                                'secretsmanager:GetSecretValue'
                            ]
                        })
                    ]
                }),
                lambda: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
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
                codedeploy: new lib_1.PolicyDocument({
                    statements: [
                        new aws_iam_1.PolicyStatement({
                            effect: aws_iam_1.Effect.ALLOW,
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
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
            ]
        });
        // Build Lambda
        const lambdaBuild = new codebuild.PipelineProject(this, "LambdaBuild", {
            role: codeBuildUser,
            vpc: props.vpc,
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        'runtime-versions': {
                            php: 7.4
                        },
                        commands: [
                            // 'npm i -g aws-cdk serverless',
                            'npm i',
                            'ls -la',
                            'cd laravel && composer install && npm i && npm run build && cd ../',
                        ]
                    },
                    build: {
                        commands: [
                            "npm run build",
                            `aws s3 sync laravel/public/assets s3://${props.s3.bucketName} --exclude *.php`,
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
                codebuild.FileSystemLocation.efs({
                    identifier: "codebuild_efs",
                    location: props.efs.fileSystemId + '.efs.' + props.vpc.env.region + '.amazonaws.com' + ':' + '/export/lambda',
                    mountPoint: '/mnt/efs',
                    mountOptions: 'nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport',
                })
            ],
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
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
                        new codepipeline_actions.GitHubSourceAction({
                            actionName: 'Checkout',
                            output: sourceOutput,
                            owner: "timsilog",
                            repo: "testCICD",
                            oauthToken: core_1.SecretValue.plainText(env.GITHUB_TOKEN),
                            trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Lambda_Build',
                            project: lambdaBuild,
                            input: sourceOutput,
                            outputs: [lambdaBuildOutput],
                        }),
                    ],
                },
            ],
        });
    }
}
exports.PipelineStack = PipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsd0NBQThFO0FBRzlFLDBFQUEwRTtBQUMxRSwwREFBMEQ7QUFDMUQsb0RBQW9EO0FBR3BELDhDQUFzSDtBQUV0SCx5Q0FBaUM7QUFDakMsOENBQXNEO0FBRXRELE1BQU0sR0FBRyxHQUFHLGdCQUFJLENBQUM7SUFDYixZQUFZLEVBQUUsTUFBTTtDQUN2QixDQUFDLENBQUM7QUFvQkgsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDeEMsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqRCxNQUFNLGlCQUFpQixHQUFHLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSwwQkFBZ0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3pELFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsU0FBUyxFQUFFLDRCQUE0QjtZQUN2QyxjQUFjLEVBQUU7Z0JBQ1osZUFBZSxFQUFFLElBQUksb0JBQWMsQ0FBQztvQkFDaEMsVUFBVSxFQUFFO3dCQUNSLElBQUkseUJBQWUsQ0FBQzs0QkFDaEIsTUFBTSxFQUFFLGdCQUFNLENBQUMsS0FBSzs0QkFDcEIsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDOzRCQUNoQixPQUFPLEVBQUU7Z0NBQ0wsK0JBQStCOzZCQUNsQzt5QkFDSixDQUFDO3FCQUNMO2lCQUNK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QkFDcEIsS0FBSyxFQUFFLFlBQVk7NEJBQ25CLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDO3lCQUMvQixDQUFDO3FCQU9MO2lCQUNKO2FBZ0JKO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBL09ELHNDQStPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuaW1wb3J0IHsgQXBwLCBEdXJhdGlvbiwgU3RhY2ssIFN0YWNrUHJvcHMsIFNlY3JldFZhbHVlIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCB7IFBlZXIsIFBvcnQsIFNlY3VyaXR5R3JvdXAsIFN1Ym5ldFR5cGUsIFZwYyB9IGZyb20gXCJAYXdzLWNkay9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBlZnMgZnJvbSBcIkBhd3MtY2RrL2F3cy1lZnNcIjtcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZV9hY3Rpb25zIGZyb20gXCJAYXdzLWNkay9hd3MtY29kZXBpcGVsaW5lLWFjdGlvbnNcIjtcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZSBmcm9tIFwiQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZVwiO1xuaW1wb3J0ICogYXMgY29kZWJ1aWxkIGZyb20gXCJAYXdzLWNkay9hd3MtY29kZWJ1aWxkXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiQGF3cy1jZGsvYXdzLXMzXCI7XG5pbXBvcnQgeyBDbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHsgUm9sZSwgUG9saWN5U3RhdGVtZW50LCBFZmZlY3QsIE1hbmFnZWRQb2xpY3ksIFNlcnZpY2VQcmluY2lwYWwsIENvbXBvc2l0ZVByaW5jaXBhbCB9IGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCI7XG5pbXBvcnQgeyBJU2VjcmV0LCBTZWNyZXQsIFNlY3JldFN0cmluZ0dlbmVyYXRvciB9IGZyb20gXCJAYXdzLWNkay9hd3Mtc2VjcmV0c21hbmFnZXJcIjtcbmltcG9ydCB7IGxvYWQgfSBmcm9tIFwidHMtZG90ZW52XCI7XG5pbXBvcnQgeyBQb2xpY3lEb2N1bWVudCB9IGZyb20gXCJAYXdzLWNkay9hd3MtaWFtL2xpYlwiO1xuXG5jb25zdCBlbnYgPSBsb2FkKHtcbiAgICBHSVRIVUJfVE9LRU46IFN0cmluZ1xufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZWxpbmVTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gICAgLy8gd29yZHByZXNzQXJuOiBzdHJpbmcsXG4gICAgczM6IHMzLkJ1Y2tldCxcbiAgICB2cGM6IFZwYyxcbiAgICBlZnM6IGVmcy5GaWxlU3lzdGVtLFxuICAgIGNsb3VkZnJvbnQ6IENsb3VkRnJvbnRXZWJEaXN0cmlidXRpb25cbiAgICBkYXRhYmFzZUFjY2Vzc1NlY3VyaXR5R3JvdXA6IFNlY3VyaXR5R3JvdXBcbiAgICBlZnNBY2Nlc3NTZWN1cml0eUdyb3VwOiBTZWN1cml0eUdyb3VwXG4gICAgZWdyZXNzU2VjdXJpdHlHcm91cDogU2VjdXJpdHlHcm91cFxuICAgIHJkc0VuZHBvaW50OiBzdHJpbmdcbiAgICByZHNEYjogc3RyaW5nXG4gICAgbGFyYXZlbEFybjogc3RyaW5nLFxuICAgIHJkc0Fybjogc3RyaW5nLFxuICAgIHJkc1NlY3JldDogSVNlY3JldCxcbiAgICByZHNQb3J0OiBzdHJpbmcsXG4gICAgLy9sYW1iZGE6IGxhbWJkYS5GdW5jdGlvbixcbn1cblxuZXhwb3J0IGNsYXNzIFBpcGVsaW5lU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUGlwZWxpbmVTdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIGNvbnN0IHNvdXJjZU91dHB1dCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoKTtcbiAgICAgICAgY29uc3QgbGFtYmRhQnVpbGRPdXRwdXQgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCdMYW1iZGFCdWlsZE91dHB1dCcpO1xuXG4gICAgICAgIGNvbnN0IGNvZGVQaXBlbGluZVNlcnZpY2VQcmluY2lwYWwgPSBuZXcgU2VydmljZVByaW5jaXBhbCgnY29kZXBpcGVsaW5lLmFtYXpvbmF3cy5jb20nKTtcbiAgICAgICAgY29uc3QgY29kZVBpcGVsaW5lVXNlciA9IG5ldyBSb2xlKHRoaXMsICdjb2RlUGlwZWxpbmVVc2VyMicsIHtcbiAgICAgICAgICAgIHJvbGVOYW1lOiAnY29kZVBpcGVsaW5lVXNlcjInLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBjb2RlUGlwZWxpbmVTZXJ2aWNlUHJpbmNpcGFsLFxuICAgICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICBjbG91ZGZvcm1hdGlvbnM6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgICAgICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvblMzRnVsbEFjY2VzcycpXG4gICAgICAgICAgICBdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvZGVCdWlsZFNlcnZpY2VQcmluY2lwYWwgPSBuZXcgU2VydmljZVByaW5jaXBhbCgnY29kZWJ1aWxkLmFtYXpvbmF3cy5jb20nKTtcbiAgICAgICAgY29uc3QgY29kZUJ1aWxkVXNlciA9IG5ldyBSb2xlKHRoaXMsICdjb2RlQnVpbGRVc2VyMicsIHtcbiAgICAgICAgICAgIHJvbGVOYW1lOiAnY29kZUJ1aWxkVXNlcjInLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBjb2RlQnVpbGRTZXJ2aWNlUHJpbmNpcGFsLFxuICAgICAgICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgICAgICAgICBjbG91ZGZvcm1hdGlvbnM6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc291cmNlczogW3Byb3BzLndvcmRwcmVzc0FybiArICcqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbG91ZGZvcm1hdGlvbjoqJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIGNsb3VkZnJvbnQ6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9yZXNvdXJjZXM6IFtwcm9wcy5jbG91ZGZyb250ICsgJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbG91ZGZyb250OkdldERpc3RyaWJ1dGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICByZHM6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLnJkc0Fybl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAncmRzOkRlc2NyaWJlREJJbnN0YW5jZXMnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIGlhbTogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpYW06R2V0Um9sZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvZG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2lhbTpQYXNzUm9sZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgc2VjcmV0czogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMucmRzU2VjcmV0LnNlY3JldEFybl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIGxhbWJkYTogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbG91ZHdhdGNoOkRlc2NyaWJlQWxhcm1zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbWJkYTpHZXRGdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsYW1iZGE6RGVsZXRlRnVuY3Rpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGFtYmRhOlVwZGF0ZUZ1bmN0aW9uQ29kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsYW1iZGE6VXBkYXRlRnVuY3Rpb25Db25maWd1cmF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbWJkYTpMaXN0VmVyc2lvbnNCeUZ1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbWJkYTpQdWJsaXNoVmVyc2lvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsYW1iZGE6VXBkYXRlQWxpYXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGFtYmRhOkdldEFsaWFzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xhbWJkYTpHZXRQcm92aXNpb25lZENvbmN1cnJlbmN5Q29uZmlnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBjb2RlZGVwbG95OiBuZXcgUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvZGVkZXBsb3k6Q3JlYXRlRGVwbG95bWVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb2RlZGVwbG95OkdldERlcGxveW1lbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29kZWRlcGxveTpHZXREZXBsb3ltZW50Q29uZmlnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvZGVkZXBsb3k6UmVnaXN0ZXJBcHBsaWNhdGlvblJldmlzaW9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICAgICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25TM0Z1bGxBY2Nlc3MnKVxuICAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCBMYW1iZGFcbiAgICAgICAgY29uc3QgbGFtYmRhQnVpbGQgPSBuZXcgY29kZWJ1aWxkLlBpcGVsaW5lUHJvamVjdCh0aGlzLCBcIkxhbWJkYUJ1aWxkXCIsIHtcbiAgICAgICAgICAgIHJvbGU6IGNvZGVCdWlsZFVzZXIsXG4gICAgICAgICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgICAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBcIjAuMlwiLFxuICAgICAgICAgICAgICAgIHBoYXNlczoge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YWxsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAncnVudGltZS12ZXJzaW9ucyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaHA6IDcuNFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJ25wbSBpIC1nIGF3cy1jZGsgc2VydmVybGVzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25wbSBpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbHMgLWxhJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2QgbGFyYXZlbCAmJiBjb21wb3NlciBpbnN0YWxsICYmIG5wbSBpICYmIG5wbSBydW4gYnVpbGQgJiYgY2QgLi4vJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJucG0gcnVuIGJ1aWxkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYGF3cyBzMyBzeW5jIGxhcmF2ZWwvcHVibGljL2Fzc2V0cyBzMzovLyR7cHJvcHMuczMuYnVja2V0TmFtZX0gLS1leGNsdWRlICoucGhwYCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcInNlcnZlcmxlc3MgZGVwbG95XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgICAgICAgICAgICBcImJhc2UtZGlyZWN0b3J5XCI6IFwibGFyYXZlbFwiLFxuICAgICAgICAgICAgICAgICAgICBmaWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIqKi8qXCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgZmlsZVN5c3RlbUxvY2F0aW9uczogW1xuICAgICAgICAgICAgICAgIGNvZGVidWlsZC5GaWxlU3lzdGVtTG9jYXRpb24uZWZzKHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogXCJjb2RlYnVpbGRfZWZzXCIsXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBwcm9wcy5lZnMuZmlsZVN5c3RlbUlkICsgJy5lZnMuJyArIHByb3BzLnZwYy5lbnYucmVnaW9uICsgJy5hbWF6b25hd3MuY29tJyArICc6JyArICcvZXhwb3J0L2xhbWJkYScsXG4gICAgICAgICAgICAgICAgICAgIG1vdW50UG9pbnQ6ICcvbW50L2VmcycsXG4gICAgICAgICAgICAgICAgICAgIG1vdW50T3B0aW9uczogJ25mc3ZlcnM9NC4xLHJzaXplPTEwNDg1NzYsd3NpemU9MTA0ODU3NixoYXJkLHRpbWVvPTYwMCxyZXRyYW5zPTIsbm9yZXN2cG9ydCcsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuU1RBTkRBUkRfNF8wLFxuICAgICAgICAgICAgICAgIHByaXZpbGVnZWQ6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IHtcbiAgICAgICAgICAgICAgICBHSVRIVUJfVE9LRU46IHsgdmFsdWU6IGVudi5HSVRIVUJfVE9LRU4gfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbcHJvcHMuZGF0YWJhc2VBY2Nlc3NTZWN1cml0eUdyb3VwLCBwcm9wcy5lZnNBY2Nlc3NTZWN1cml0eUdyb3VwLCBwcm9wcy5lZ3Jlc3NTZWN1cml0eUdyb3VwXVxuICAgICAgICB9KTtcblxuXG4gICAgICAgIG5ldyBjb2RlcGlwZWxpbmUuUGlwZWxpbmUodGhpcywgJ1BpcGVsaW5lMicsIHtcbiAgICAgICAgICAgIHJvbGU6IGNvZGVQaXBlbGluZVVzZXIsXG4gICAgICAgICAgICByZXN0YXJ0RXhlY3V0aW9uT25VcGRhdGU6IHRydWUsXG4gICAgICAgICAgICBzdGFnZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHN0YWdlTmFtZTogJ1NvdXJjZScsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5HaXRIdWJTb3VyY2VBY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdDaGVja291dCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duZXI6IFwidGltc2lsb2dcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBvOiBcInRlc3RDSUNEXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2F1dGhUb2tlbjogU2VjcmV0VmFsdWUucGxhaW5UZXh0KGVudi5HSVRIVUJfVE9LRU4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IGNvZGVwaXBlbGluZV9hY3Rpb25zLkdpdEh1YlRyaWdnZXIuV0VCSE9PSyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzdGFnZU5hbWU6ICdCdWlsZCcsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdMYW1iZGFfQnVpbGQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Q6IGxhbWJkYUJ1aWxkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0czogW2xhbWJkYUJ1aWxkT3V0cHV0XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNvZGVCdWlsZEFjdGlvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGFjdGlvbk5hbWU6ICdDREtfQnVpbGQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBwcm9qZWN0OiBjZGtCdWlsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgaW5wdXQ6IHNvdXJjZU91dHB1dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgb3V0cHV0czogW2Nka0J1aWxkT3V0cHV0XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pLFxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8ge1xuICAgICAgICAgICAgICAgIC8vICAgc3RhZ2VOYW1lOiAnRGVwbG95JyxcbiAgICAgICAgICAgICAgICAvLyAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAvLyAgICAgbmV3IGNvZGVwaXBlbGluZV9hY3Rpb25zLkNsb3VkRm9ybWF0aW9uQ3JlYXRlVXBkYXRlU3RhY2tBY3Rpb24oe1xuICAgICAgICAgICAgICAgIC8vICAgICAgIGFjdGlvbk5hbWU6ICdMYW1iZGFfQ0ZOX0RlcGxveScsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgdGVtcGxhdGVQYXRoOiBjZGtCdWlsZE91dHB1dC5hdFBhdGgoJ0xhbWJkYVN0YWNrLnRlbXBsYXRlLmpzb24nKSxcbiAgICAgICAgICAgICAgICAvLyAgICAgICBzdGFja05hbWU6ICdMYW1iZGFEZXBsb3ltZW50U3RhY2snLFxuICAgICAgICAgICAgICAgIC8vICAgICAgIGFkbWluUGVybWlzc2lvbnM6IHRydWUsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgcGFyYW1ldGVyT3ZlcnJpZGVzOiB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAuLi5wcm9wcy5sYW1iZGFDb2RlLmFzc2lnbihsYW1iZGFCdWlsZE91dHB1dC5zM0xvY2F0aW9uKSxcbiAgICAgICAgICAgICAgICAvLyAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vICAgICAgIGV4dHJhSW5wdXRzOiBbbGFtYmRhQnVpbGRPdXRwdXRdLFxuICAgICAgICAgICAgICAgIC8vICAgICB9KSxcbiAgICAgICAgICAgICAgICAvLyAgIF0sXG4gICAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==