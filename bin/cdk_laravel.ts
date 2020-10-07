#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as rds from "@aws-cdk/aws-rds"
import { VpcStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { Stack, ArnComponents } from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';
import { StorageStack } from "../lib/storage-stack";
import { LaravelStack } from '../lib/laravel-stack';
import config from '../config';
import { IamCommonStack } from '../lib/iam-common-stack';

const app = new cdk.App();

const vpcStack = new VpcStack(app, 'VPC');
const rdsStack = new RDSStack(app, 'Database', {
    vpc: vpcStack.vpc,
});
const iamCommonStack = new IamCommonStack(app, 'IamCommon', {
    vpc: vpcStack.vpc,
})
const storageStack = new StorageStack(app, 'Storage2', {
    vpc: vpcStack.vpc,
    efsAccessSecurityGroup: iamCommonStack.efsAccessSecurityGroup,
    OAI: iamCommonStack.OAI
});

const laravelStack = new LaravelStack(app, 'Laravel', {
    vpc: vpcStack.vpc,
    efs: storageStack.EFSInstance,
    s3: storageStack.S3Bucket,
    oai: storageStack.OAI,
    databaseAccessSecurityGroup: rdsStack.databaseAccessSecurityGroup,
    efsAccessSecurityGroup: storageStack.efsAccessSecurityGroup,
    rdsEndpoint: rdsStack.mySQLRDSInstance.dbInstanceEndpointAddress,
    rdsDb: rdsStack.database,
    rdsPort: rdsStack.mySQLRDSInstance.dbInstanceEndpointPort,
    rdsCredentials: rdsStack.credentials
});

new PipelineStack(app, 'Pipeline2', {
    s3: storageStack.S3Bucket,
    vpc: vpcStack.vpc,
    efs: storageStack.EFSInstance,
    cloudfront: laravelStack.cloudfront,
    databaseAccessSecurityGroup: rdsStack.databaseAccessSecurityGroup,
    efsAccessSecurityGroup: storageStack.efsAccessSecurityGroup,
    egressSecurityGroup: vpcStack.egressSecurityGroup,
    laravelArn: laravelStack.formatArn({
        service: 'cloudformation',
        resource: 'stack',
    }),
    rdsArn: rdsStack.mySQLRDSInstance.instanceArn,
    rdsEndpoint: rdsStack.mySQLRDSInstance.dbInstanceEndpointAddress,
    // rdsDbUser: rdsStack.username,
    // rdsDbPassword: rdsStack.secret,
    rdsSecret: rdsStack.secret,
    rdsDb: rdsStack.database,
    rdsPort: rdsStack.mySQLRDSInstance.dbInstanceEndpointPort,
    //lambda: wpStack.lambda
});

app.synth();
