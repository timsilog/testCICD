import { App, Duration, Stack, StackProps } from "@aws-cdk/core";
import { InstanceClass, InstanceSize, InstanceType, Peer, SubnetType, Vpc } from "@aws-cdk/aws-ec2";
import * as cdk from '@aws-cdk/core';
import * as s3 from "@aws-cdk/aws-s3";
import { FileSystem, PerformanceMode, ThroughputMode } from '@aws-cdk/aws-efs';
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { SecurityGroup } from "@aws-cdk/aws-ec2/lib";

export interface StorageStackProps extends StackProps {
    vpc: Vpc;
    efsAccessSecurityGroup: SecurityGroup,
    OAI: OriginAccessIdentity
}

export class StorageStack extends cdk.Stack {
    readonly EFSInstance: FileSystem;
    readonly S3Bucket: s3.Bucket;
    readonly OAI: OriginAccessIdentity;
    readonly efsAccessSecurityGroup: SecurityGroup;

    constructor(scope: cdk.Construct, id: string, props: StorageStackProps) {
        super(scope, id, props);

        this.efsAccessSecurityGroup = props.efsAccessSecurityGroup;
        this.OAI = props.OAI;

        // EFS Storage
        this.EFSInstance = new FileSystem(this, 'Wordpress_EFS', {
            vpc: props.vpc,
            encrypted: true,
            performanceMode: PerformanceMode.GENERAL_PURPOSE,
            throughputMode: ThroughputMode.BURSTING
        });
        this.EFSInstance.connections.allowDefaultPortFrom(this.efsAccessSecurityGroup);

        this.S3Bucket = new s3.Bucket(this, 'Wordpress_S3', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })
    }
}


