import { App, Stack, StackProps } from '@aws-cdk/core';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService, Peer, Port, SecurityGroup, SubnetType, Vpc } from '@aws-cdk/aws-ec2'

export class VpcStack extends Stack {
    readonly vpc: Vpc;
    readonly egressSecurityGroup: SecurityGroup;
    readonly sesVpcEndpointSecurityGroup: SecurityGroup;

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

        // SQS
        const sqsEndpoint = this.vpc.addInterfaceEndpoint('sqs-gateway', {
            service: InterfaceVpcEndpointAwsService.SQS,
        });
        sqsEndpoint.connections.allowDefaultPortFromAnyIpv4();

        // SES (there's no static member yet. taken from https://github.com/aws/aws-cdk/issues/9386)
        // Gives: The VPC endpoint service com.amazonaws.us-east-1.email-smtp does not support the availability zone of
        // the subnet: subnet-0ada30b5703616908
        // this.sesVpcEndpointSecurityGroup = new SecurityGroup(this, `ses-vpc-security-group`, {
        //     vpc: this.vpc,
        //     description: `My SES VPC endpoint security group`,
        // });
        // const sesEndpoint = this.vpc.addInterfaceEndpoint(`ses-gateway`, {
        //     service: new InterfaceVpcEndpointAwsService('email-smtp'),
        //     securityGroups: [this.sesVpcEndpointSecurityGroup],
        // });
        // sesEndpoint.connections.allowDefaultPortFromAnyIpv4();

        // Secrets Manager
        const secretsManagerEndpoint = this.vpc.addInterfaceEndpoint('secrets-manager-gateway', {
            service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        });
        secretsManagerEndpoint.connections.allowDefaultPortFromAnyIpv4();

        // S3 (use interface or gateway?? Bucci says gateway is cheaper)
        this.vpc.addGatewayEndpoint('s3-gateway', {
            service: GatewayVpcEndpointAwsService.S3,
        })
        // this.vpc.addInterfaceEndpoint('s3-gateway', {
        //     service: InterfaceVpcEndpointAwsService.STORAGE_GATEWAY
        // })
    }
}
