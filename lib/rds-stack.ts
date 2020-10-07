import { App, Duration, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { DatabaseInstance, DatabaseInstanceEngine, StorageType, Credentials } from '@aws-cdk/aws-rds';
import { ISecret, Secret, SecretStringGenerator } from '@aws-cdk/aws-secretsmanager';
import { InstanceClass, InstanceSize, InstanceType, Peer, SecurityGroup, SubnetType, Vpc, Port } from "@aws-cdk/aws-ec2";
import config from '../config';

export interface RDSStackProps extends StackProps {
    vpc: Vpc;
}

export class RDSStack extends Stack {

    readonly credentials: Credentials;
    readonly secret: Secret
    readonly database: string;
    readonly mySQLRDSInstance: DatabaseInstance;
    readonly databaseAccessSecurityGroup: SecurityGroup

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        this.secret = new Secret(this, `wordpress_database_password`, {
            generateSecretString: {
                excludePunctuation: true
            }
        });
        this.credentials = Credentials.fromUsername(`wordpress_admin`, { password: this.secret.secretValue });
        // this.database = config.appName; // maybe use different name
        this.database = "Wordpress";
        this.databaseAccessSecurityGroup = new SecurityGroup(this, 'rds-security-group', {
            vpc: props.vpc,
            allowAllOutbound: false,
            securityGroupName: 'RDSSecurityGroup',
        });

        var inboundDbAccessSecurityGroup = new SecurityGroup(this, 'ingress-security-group', {
            vpc: props.vpc,
            allowAllOutbound: false,
            securityGroupName: 'IngressSecurityGroup',
        });

        this.databaseAccessSecurityGroup.addEgressRule(inboundDbAccessSecurityGroup, Port.tcp(3306));
        inboundDbAccessSecurityGroup.addIngressRule(this.databaseAccessSecurityGroup, Port.tcp(3306));

        this.mySQLRDSInstance = new DatabaseInstance(this, 'mysql-rds-instance', {
            engine: DatabaseInstanceEngine.MYSQL,
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.SMALL),
            vpc: props.vpc,
            vpcPlacement: { subnetType: SubnetType.PRIVATE },
            storageEncrypted: true,
            multiAz: false,
            autoMinorVersionUpgrade: true,
            allocatedStorage: 25,
            storageType: StorageType.GP2,
            backupRetention: Duration.days(3),
            deletionProtection: false,
            credentials: this.credentials,
            databaseName: this.database,
            securityGroups: [inboundDbAccessSecurityGroup],
            port: 3306
        });
    }
}