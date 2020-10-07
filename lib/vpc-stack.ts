import { App, Stack, StackProps } from '@aws-cdk/core';
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from '@aws-cdk/aws-ec2'

export class VpcStack extends Stack {
    readonly vpc: Vpc;
    readonly egressSecurityGroup: SecurityGroup;

    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = new Vpc(this, 'CustomVPC', {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 26,
                    name: 'publicSubnet',
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    cidrMask: 26,
                    name: 'privateSubnet',
                    subnetType: SubnetType.PRIVATE,
                }
            ],
            natGateways: 1
        });

        this.egressSecurityGroup = new SecurityGroup(this, 'egress-security-group', {
            vpc: this.vpc,
            allowAllOutbound: true,
            securityGroupName: 'EgressSecurityGroup',
        });
    }
}
