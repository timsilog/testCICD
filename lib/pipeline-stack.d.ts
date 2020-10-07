import * as cdk from "@aws-cdk/core";
import { StackProps } from "@aws-cdk/core";
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
import * as efs from "@aws-cdk/aws-efs";
import * as s3 from "@aws-cdk/aws-s3";
import { CloudFrontWebDistribution } from '@aws-cdk/aws-cloudfront';
import { ISecret } from "@aws-cdk/aws-secretsmanager";
export interface PipelineStackProps extends StackProps {
    s3: s3.Bucket;
    vpc: Vpc;
    efs: efs.FileSystem;
    cloudfront: CloudFrontWebDistribution;
    databaseAccessSecurityGroup: SecurityGroup;
    efsAccessSecurityGroup: SecurityGroup;
    egressSecurityGroup: SecurityGroup;
    rdsEndpoint: string;
    rdsDb: string;
    laravelArn: string;
    rdsArn: string;
    rdsSecret: ISecret;
    rdsPort: string;
}
export declare class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: PipelineStackProps);
}
