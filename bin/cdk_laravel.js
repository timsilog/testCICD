#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("@aws-cdk/core");
const vpc_stack_1 = require("../lib/vpc-stack");
const rds_stack_1 = require("../lib/rds-stack");
const pipeline_stack_1 = require("../lib/pipeline-stack");
const storage_stack_1 = require("../lib/storage-stack");
const laravel_stack_1 = require("../lib/laravel-stack");
const iam_common_stack_1 = require("../lib/iam-common-stack");
const app = new cdk.App();
const vpcStack = new vpc_stack_1.VpcStack(app, 'VPC');
const rdsStack = new rds_stack_1.RDSStack(app, 'Database', {
    vpc: vpcStack.vpc,
});
const iamCommonStack = new iam_common_stack_1.IamCommonStack(app, 'IamCommon', {
    vpc: vpcStack.vpc,
});
const storageStack = new storage_stack_1.StorageStack(app, 'Storage2', {
    vpc: vpcStack.vpc,
    efsAccessSecurityGroup: iamCommonStack.efsAccessSecurityGroup,
    OAI: iamCommonStack.OAI
});
const laravelStack = new laravel_stack_1.LaravelStack(app, 'Laravel', {
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
new pipeline_stack_1.PipelineStack(app, 'Pipeline2', {
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
    // rdsDbUser: rdsStack.username,
    // rdsDbPassword: rdsStack.secret,
    rdsSecret: rdsStack.secret,
    rdsDb: rdsStack.database,
    rdsPort: rdsStack.mySQLRDSInstance.dbInstanceEndpointPort,
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrX2xhcmF2ZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjZGtfbGFyYXZlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx1Q0FBcUM7QUFDckMscUNBQXFDO0FBRXJDLGdEQUE0QztBQUM1QyxnREFBNEM7QUFFNUMsMERBQXNEO0FBQ3RELHdEQUFvRDtBQUNwRCx3REFBb0Q7QUFFcEQsOERBQXlEO0FBRXpELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUU7SUFDM0MsR0FBRyxFQUFFLFFBQVEsQ0FBQyxHQUFHO0NBQ3BCLENBQUMsQ0FBQztBQUNILE1BQU0sY0FBYyxHQUFHLElBQUksaUNBQWMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFO0lBQ3hELEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztDQUNwQixDQUFDLENBQUE7QUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRTtJQUNuRCxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUc7SUFDakIsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLHNCQUFzQjtJQUM3RCxHQUFHLEVBQUUsY0FBYyxDQUFDLEdBQUc7Q0FDMUIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUU7SUFDbEQsR0FBRyxFQUFFLFFBQVEsQ0FBQyxHQUFHO0lBQ2pCLEdBQUcsRUFBRSxZQUFZLENBQUMsV0FBVztJQUM3QixFQUFFLEVBQUUsWUFBWSxDQUFDLFFBQVE7SUFDekIsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHO0lBQ3JCLDJCQUEyQixFQUFFLFFBQVEsQ0FBQywyQkFBMkI7SUFDakUsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHNCQUFzQjtJQUMzRCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsbUJBQW1CO0lBQ2pELFdBQVcsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCO0lBQ2hFLEtBQUssRUFBRSxRQUFRLENBQUMsUUFBUTtJQUN4QixPQUFPLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQjtJQUN6RCxjQUFjLEVBQUUsUUFBUSxDQUFDLFdBQVc7Q0FDdkMsQ0FBQyxDQUFDO0FBQ0gsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7SUFDaEMsRUFBRSxFQUFFLFlBQVksQ0FBQyxRQUFRO0lBQ3pCLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztJQUNqQixHQUFHLEVBQUUsWUFBWSxDQUFDLFdBQVc7SUFDN0IsdUNBQXVDO0lBQ3ZDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQywyQkFBMkI7SUFDakUsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHNCQUFzQjtJQUMzRCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsbUJBQW1CO0lBQ2pELFVBQVUsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDO1FBQy9CLE9BQU8sRUFBRSxnQkFBZ0I7UUFDekIsUUFBUSxFQUFFLE9BQU87S0FDcEIsQ0FBQztJQUNGLE1BQU0sRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVztJQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QjtJQUNoRSxnQ0FBZ0M7SUFDaEMsa0NBQWtDO0lBQ2xDLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTTtJQUMxQixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVE7SUFDeEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0I7Q0FFNUQsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gXCJAYXdzLWNkay9hd3MtcmRzXCJcbmltcG9ydCB7IFZwY1N0YWNrIH0gZnJvbSAnLi4vbGliL3ZwYy1zdGFjayc7XG5pbXBvcnQgeyBSRFNTdGFjayB9IGZyb20gJy4uL2xpYi9yZHMtc3RhY2snO1xuaW1wb3J0IHsgU3RhY2ssIEFybkNvbXBvbmVudHMgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IFBpcGVsaW5lU3RhY2sgfSBmcm9tICcuLi9saWIvcGlwZWxpbmUtc3RhY2snO1xuaW1wb3J0IHsgU3RvcmFnZVN0YWNrIH0gZnJvbSBcIi4uL2xpYi9zdG9yYWdlLXN0YWNrXCI7XG5pbXBvcnQgeyBMYXJhdmVsU3RhY2sgfSBmcm9tICcuLi9saWIvbGFyYXZlbC1zdGFjayc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgeyBJYW1Db21tb25TdGFjayB9IGZyb20gJy4uL2xpYi9pYW0tY29tbW9uLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuY29uc3QgdnBjU3RhY2sgPSBuZXcgVnBjU3RhY2soYXBwLCAnVlBDJyk7XG5jb25zdCByZHNTdGFjayA9IG5ldyBSRFNTdGFjayhhcHAsICdEYXRhYmFzZScsIHtcbiAgICB2cGM6IHZwY1N0YWNrLnZwYyxcbn0pO1xuY29uc3QgaWFtQ29tbW9uU3RhY2sgPSBuZXcgSWFtQ29tbW9uU3RhY2soYXBwLCAnSWFtQ29tbW9uJywge1xuICAgIHZwYzogdnBjU3RhY2sudnBjLFxufSlcbmNvbnN0IHN0b3JhZ2VTdGFjayA9IG5ldyBTdG9yYWdlU3RhY2soYXBwLCAnU3RvcmFnZTInLCB7XG4gICAgdnBjOiB2cGNTdGFjay52cGMsXG4gICAgZWZzQWNjZXNzU2VjdXJpdHlHcm91cDogaWFtQ29tbW9uU3RhY2suZWZzQWNjZXNzU2VjdXJpdHlHcm91cCxcbiAgICBPQUk6IGlhbUNvbW1vblN0YWNrLk9BSVxufSk7XG5cbmNvbnN0IGxhcmF2ZWxTdGFjayA9IG5ldyBMYXJhdmVsU3RhY2soYXBwLCAnTGFyYXZlbCcsIHtcbiAgICB2cGM6IHZwY1N0YWNrLnZwYyxcbiAgICBlZnM6IHN0b3JhZ2VTdGFjay5FRlNJbnN0YW5jZSxcbiAgICBzMzogc3RvcmFnZVN0YWNrLlMzQnVja2V0LFxuICAgIG9haTogc3RvcmFnZVN0YWNrLk9BSSxcbiAgICBkYXRhYmFzZUFjY2Vzc1NlY3VyaXR5R3JvdXA6IHJkc1N0YWNrLmRhdGFiYXNlQWNjZXNzU2VjdXJpdHlHcm91cCxcbiAgICBlZnNBY2Nlc3NTZWN1cml0eUdyb3VwOiBzdG9yYWdlU3RhY2suZWZzQWNjZXNzU2VjdXJpdHlHcm91cCxcbiAgICBlZ3Jlc3NTZWN1cml0eUdyb3VwOiB2cGNTdGFjay5lZ3Jlc3NTZWN1cml0eUdyb3VwLFxuICAgIHJkc0VuZHBvaW50OiByZHNTdGFjay5teVNRTFJEU0luc3RhbmNlLmRiSW5zdGFuY2VFbmRwb2ludEFkZHJlc3MsXG4gICAgcmRzRGI6IHJkc1N0YWNrLmRhdGFiYXNlLFxuICAgIHJkc1BvcnQ6IHJkc1N0YWNrLm15U1FMUkRTSW5zdGFuY2UuZGJJbnN0YW5jZUVuZHBvaW50UG9ydCxcbiAgICByZHNDcmVkZW50aWFsczogcmRzU3RhY2suY3JlZGVudGlhbHNcbn0pO1xubmV3IFBpcGVsaW5lU3RhY2soYXBwLCAnUGlwZWxpbmUyJywge1xuICAgIHMzOiBzdG9yYWdlU3RhY2suUzNCdWNrZXQsXG4gICAgdnBjOiB2cGNTdGFjay52cGMsXG4gICAgZWZzOiBzdG9yYWdlU3RhY2suRUZTSW5zdGFuY2UsXG4gICAgLy8gY2xvdWRmcm9udDogbGFyYXZlbFN0YWNrLmNsb3VkZnJvbnQsXG4gICAgZGF0YWJhc2VBY2Nlc3NTZWN1cml0eUdyb3VwOiByZHNTdGFjay5kYXRhYmFzZUFjY2Vzc1NlY3VyaXR5R3JvdXAsXG4gICAgZWZzQWNjZXNzU2VjdXJpdHlHcm91cDogc3RvcmFnZVN0YWNrLmVmc0FjY2Vzc1NlY3VyaXR5R3JvdXAsXG4gICAgZWdyZXNzU2VjdXJpdHlHcm91cDogdnBjU3RhY2suZWdyZXNzU2VjdXJpdHlHcm91cCxcbiAgICBsYXJhdmVsQXJuOiBsYXJhdmVsU3RhY2suZm9ybWF0QXJuKHtcbiAgICAgICAgc2VydmljZTogJ2Nsb3VkZm9ybWF0aW9uJyxcbiAgICAgICAgcmVzb3VyY2U6ICdzdGFjaycsXG4gICAgfSksXG4gICAgcmRzQXJuOiByZHNTdGFjay5teVNRTFJEU0luc3RhbmNlLmluc3RhbmNlQXJuLFxuICAgIHJkc0VuZHBvaW50OiByZHNTdGFjay5teVNRTFJEU0luc3RhbmNlLmRiSW5zdGFuY2VFbmRwb2ludEFkZHJlc3MsXG4gICAgLy8gcmRzRGJVc2VyOiByZHNTdGFjay51c2VybmFtZSxcbiAgICAvLyByZHNEYlBhc3N3b3JkOiByZHNTdGFjay5zZWNyZXQsXG4gICAgcmRzU2VjcmV0OiByZHNTdGFjay5zZWNyZXQsXG4gICAgcmRzRGI6IHJkc1N0YWNrLmRhdGFiYXNlLFxuICAgIHJkc1BvcnQ6IHJkc1N0YWNrLm15U1FMUkRTSW5zdGFuY2UuZGJJbnN0YW5jZUVuZHBvaW50UG9ydCxcbiAgICAvL2xhbWJkYTogd3BTdGFjay5sYW1iZGFcbn0pO1xuXG5hcHAuc3ludGgoKTsiXX0=