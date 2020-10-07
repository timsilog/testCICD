"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcStack = void 0;
const core_1 = require("@aws-cdk/core");
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
class VpcStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.vpc = new aws_ec2_1.Vpc(this, 'CustomVPC', {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 26,
                    name: 'publicSubnet',
                    subnetType: aws_ec2_1.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 26,
                    name: 'privateSubnet',
                    subnetType: aws_ec2_1.SubnetType.PRIVATE,
                }
            ],
            natGateways: 1
        });
        this.egressSecurityGroup = new aws_ec2_1.SecurityGroup(this, 'egress-security-group', {
            vpc: this.vpc,
            allowAllOutbound: true,
            securityGroupName: 'EgressSecurityGroup',
        });
    }
}
exports.VpcStack = VpcStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidnBjLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUF1RDtBQUN2RCw4Q0FBNkU7QUFFN0UsTUFBYSxRQUFTLFNBQVEsWUFBSztJQUkvQixZQUFZLEtBQVUsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDbEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLGFBQUcsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ2xDLElBQUksRUFBRSxhQUFhO1lBQ25CLE1BQU0sRUFBRSxDQUFDO1lBQ1QsbUJBQW1CLEVBQUU7Z0JBQ2pCO29CQUNJLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxjQUFjO29CQUNwQixVQUFVLEVBQUUsb0JBQVUsQ0FBQyxNQUFNO2lCQUNoQztnQkFDRDtvQkFDSSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsZUFBZTtvQkFDckIsVUFBVSxFQUFFLG9CQUFVLENBQUMsT0FBTztpQkFDakM7YUFDSjtZQUNELFdBQVcsRUFBRSxDQUFDO1NBQ2pCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLHVCQUFhLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3hFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsaUJBQWlCLEVBQUUscUJBQXFCO1NBQzNDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQS9CRCw0QkErQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBQZWVyLCBQb3J0LCBTZWN1cml0eUdyb3VwLCBTdWJuZXRUeXBlLCBWcGMgfSBmcm9tICdAYXdzLWNkay9hd3MtZWMyJ1xuXG5leHBvcnQgY2xhc3MgVnBjU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gICAgcmVhZG9ubHkgdnBjOiBWcGM7XG4gICAgcmVhZG9ubHkgZWdyZXNzU2VjdXJpdHlHcm91cDogU2VjdXJpdHlHcm91cDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBBcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICAgICB0aGlzLnZwYyA9IG5ldyBWcGModGhpcywgJ0N1c3RvbVZQQycsIHtcbiAgICAgICAgICAgIGNpZHI6ICcxMC4wLjAuMC8xNicsXG4gICAgICAgICAgICBtYXhBenM6IDIsXG4gICAgICAgICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjaWRyTWFzazogMjYsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdwdWJsaWNTdWJuZXQnLFxuICAgICAgICAgICAgICAgICAgICBzdWJuZXRUeXBlOiBTdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY2lkck1hc2s6IDI2LFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAncHJpdmF0ZVN1Ym5ldCcsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym5ldFR5cGU6IFN1Ym5ldFR5cGUuUFJJVkFURSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbmF0R2F0ZXdheXM6IDFcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5lZ3Jlc3NTZWN1cml0eUdyb3VwID0gbmV3IFNlY3VyaXR5R3JvdXAodGhpcywgJ2VncmVzcy1zZWN1cml0eS1ncm91cCcsIHtcbiAgICAgICAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICAgICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgICAgICAgc2VjdXJpdHlHcm91cE5hbWU6ICdFZ3Jlc3NTZWN1cml0eUdyb3VwJyxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19