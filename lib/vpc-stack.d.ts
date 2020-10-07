import { App, Stack, StackProps } from '@aws-cdk/core';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
export declare class VpcStack extends Stack {
    readonly vpc: Vpc;
    readonly egressSecurityGroup: SecurityGroup;
    constructor(scope: App, id: string, props?: StackProps);
}
