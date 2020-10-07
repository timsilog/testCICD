import { App, Stack, StackProps } from "@aws-cdk/core";
import { DatabaseInstance, Credentials } from '@aws-cdk/aws-rds';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
export interface RDSStackProps extends StackProps {
    vpc: Vpc;
}
export declare class RDSStack extends Stack {
    readonly credentials: Credentials;
    readonly secret: Secret;
    readonly database: string;
    readonly mySQLRDSInstance: DatabaseInstance;
    readonly databaseAccessSecurityGroup: SecurityGroup;
    constructor(scope: App, id: string, props: RDSStackProps);
}
