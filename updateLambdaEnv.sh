#! /bin/bash

# https://github.com/aws/aws-cdk/issues/1773

## To get stack output using AWS CLI
# STACK=`aws cloudformation describe-stacks \
#     --stack-name Laravel  \
#     --query "Stacks[0].Outputs" \
#     --output json`

## To get value of a particular key from $STACK
# CF_URL=`echo $STACK | jq -rc '.[] | select(.OutputKey=="cfDomainName") | .OutputValue '`
# FUNCTION_NAME=`echo $STACK | jq -rc '.[] | select(.OutputKey=="functionName") | .OutputValue '`

## Using a provided json file
JSON_FILE="cdkOutput.json"
OUTPUT_FILE="env.json"
HTTP_FUNCTION_NAME=`jq -r ".Laravel.httpFunctionName" $JSON_FILE`
WORKER_FUNCTION_NAME=`jq -r ".Laravel.workerFunctionName" $JSON_FILE`

# Remove queue name from prefix
SQS_PREFIX=`jq -r ".Laravel.env | fromjson | .SQS_PREFIX" $JSON_FILE`
echo `jq --arg newPrefix ${SQS_PREFIX%/*} '.Laravel.env | fromjson | .SQS_PREFIX = $newPrefix' $JSON_FILE` > $OUTPUT_FILE

# Get current lambda env variables then merge new ones in
HTTP_ENV=`aws lambda get-function-configuration \
    --function-name ${HTTP_FUNCTION_NAME} \
    --output json | jq -rc '.Environment'`
WORKER_ENV=`aws lambda get-function-configuration \
    --function-name ${WORKER_FUNCTION_NAME} \
    --output json | jq -rc '.Environment'`    
HTTP_COMBINED=`jq ". + ${HTTP_ENV}.Variables" $OUTPUT_FILE`
HTTP_COMBINED=`jq ". + ${WORKER_ENV}.Variables" $OUTPUT_FILE`

# Write new env variables to the lambda function
aws lambda update-function-configuration \
    --function-name  $HTTP_FUNCTION_NAME \
    --environment "{\"Variables\": $HTTP_COMBINED}"

aws lambda update-function-configuration \
    --function-name  $WORKER_FUNCTION_NAME \
    --environment "{\"Variables\": $WORKER_COMBINED}"