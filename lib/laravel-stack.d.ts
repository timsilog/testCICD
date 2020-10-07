import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { CloudFrontWebDistribution, OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { Credentials } from '@aws-cdk/aws-rds';
import * as s3 from "@aws-cdk/aws-s3";
import * as efs from '@aws-cdk/aws-efs';
interface ApplicationStackProps extends cdk.StackProps {
    vpc: Vpc;
    databaseAccessSecurityGroup: SecurityGroup;
    efsAccessSecurityGroup: SecurityGroup;
    rdsEndpoint: string;
    rdsDb: string;
    rdsPort: string;
    rdsCredentials: Credentials;
    efs: efs.FileSystem;
    s3: s3.Bucket;
    oai: OriginAccessIdentity;
}
export declare class LaravelStack extends cdk.Stack {
    readonly lambda: lambda.Function;
    readonly cloudfront: CloudFrontWebDistribution;
    constructor(scope: cdk.Construct, id: string, props: ApplicationStackProps);
}
export {};
