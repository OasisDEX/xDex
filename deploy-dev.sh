rm -rf ./build

# This is using `.env.dev` configuration file with feature flags
PUBLIC_URL='https://oasisapp-staging.makerfoundation.com/trade' yarn build:ci

# Deploy to AWS
sudo apt update
sudo apt install python-pip
pip install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

echo $STAGING_AWS_REGION
echo $STAGING_AWS_ACCESS_KEY_ID
echo $STAGING_AWS_SECRET_ACCESS_KEY
echo $STAGING_AWS_BUCKET_NAME
echo $STAGING_AWS_CF_ID

aws configure set default.region $STAGING_AWS_REGION
aws configure set default.output json
aws configure set aws_access_key_id $STAGING_AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $STAGING_AWS_SECRET_ACCESS_KEY

aws s3 ls s3://$STAGING_AWS_BUCKET_NAME/trade/

aws s3 sync ./build s3://$STAGING_AWS_BUCKET_NAME/trade/ --delete
aws cloudfront create-invalidation --distribution-id $STAGING_AWS_CF_ID --paths "/*"

