#! /bin/bash

# https://github.com/aws/aws-cdk/issues/1773

STACK=`aws cloudformation describe-stacks \
    --stack-name Laravel  \
    --query "Stacks[0].Outputs" \
    --output json`

CF_URL=`echo $STACK | jq -rc '.[] | select(.OutputKey=="cfDomainName") | .OutputValue '`
FUNCTION_NAME=`echo $STACK | jq -rc '.[] | select(.OutputKey=="functionName") | .OutputValue '`

echo $CF_URL
echo $FUNCTION_NAME

ENV=`aws lambda get-function-configuration \
    --function-name ${FUNCTION_NAME} \
    --output json | jq -rc '.Environment'`

COMBINED=`echo "{\"AWS_URL\":\"$CF_URL\"}" | jq ". + ${ENV}.Variables"`

aws lambda update-function-configuration \
    --function-name  $FUNCTION_NAME \
    --environment "{\"Variables\": $COMBINED}"