#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
// import * as rds from "@aws-cdk/aws-rds"
import { VpcStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { StorageStack } from "../lib/storage-stack";
import { LaravelStack } from '../lib/laravel-stack';
// import config from '../config';

const app = new App();

const vpcStack = new VpcStack(app, 'VPC');
const rdsStack = new RDSStack(app, 'Database', {
    vpc: vpcStack.vpc,
});

const storageStack = new StorageStack(app, 'Storage2', {
    vpc: vpcStack.vpc,
});

const laravelStack = new LaravelStack(app, 'Laravel', {
    vpc: vpcStack.vpc,
    efs: storageStack.EFSInstance,
    s3: storageStack.S3Bucket,
    oai: storageStack.OAI,
    databaseAccessSecurityGroup: rdsStack.databaseAccessSecurityGroup,
    efsAccessSecurityGroup: storageStack.efsAccessSecurityGroup,
    egressSecurityGroup: vpcStack.egressSecurityGroup,
    rdsEndpoint: rdsStack.mySQLRDSInstance.dbInstanceEndpointAddress,
    rdsDb: rdsStack.database,
    rdsPort: rdsStack.mySQLRDSInstance.dbInstanceEndpointPort,
    rdsCredentials: rdsStack.credentials
});
new PipelineStack(app, 'Pipeline2', {
    s3: storageStack.S3Bucket,
    vpc: vpcStack.vpc,
    efs: storageStack.EFSInstance,
    // cloudfront: laravelStack.cloudfront,
    databaseAccessSecurityGroup: rdsStack.databaseAccessSecurityGroup,
    efsAccessSecurityGroup: storageStack.efsAccessSecurityGroup,
    egressSecurityGroup: vpcStack.egressSecurityGroup,
    laravelArn: laravelStack.formatArn({
        service: 'cloudformation',
        resource: 'stack',
    }),
    rdsArn: rdsStack.mySQLRDSInstance.instanceArn,
    rdsEndpoint: rdsStack.mySQLRDSInstance.dbInstanceEndpointAddress,
    rdsSecret: rdsStack.secret,
    rdsDb: rdsStack.database,
    rdsPort: rdsStack.mySQLRDSInstance.dbInstanceEndpointPort,
});

app.synth();