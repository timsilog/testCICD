import { StackProps } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import * as cdk from '@aws-cdk/core';
import * as s3 from "@aws-cdk/aws-s3";
import { FileSystem } from '@aws-cdk/aws-efs';
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { SecurityGroup } from "@aws-cdk/aws-ec2/lib";
export interface StorageStackProps extends StackProps {
    vpc: Vpc;
    efsAccessSecurityGroup: SecurityGroup;
    OAI: OriginAccessIdentity;
}
export declare class StorageStack extends cdk.Stack {
    readonly EFSInstance: FileSystem;
    readonly S3Bucket: s3.Bucket;
    readonly OAI: OriginAccessIdentity;
    readonly efsAccessSecurityGroup: SecurityGroup;
    constructor(scope: cdk.Construct, id: string, props: StorageStackProps);
}
