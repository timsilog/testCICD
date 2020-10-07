import { StackProps } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack, Construct } from '@aws-cdk/core';
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { SecurityGroup } from "@aws-cdk/aws-ec2/lib";
export interface IamCommonStackProps extends StackProps {
    vpc: Vpc;
}
export declare class IamCommonStack extends Stack {
    readonly OAI: OriginAccessIdentity;
    readonly efsAccessSecurityGroup: SecurityGroup;
    constructor(scope: Construct, id: string, props: IamCommonStackProps);
}
