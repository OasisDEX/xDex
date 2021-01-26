rm -rf ./build

# This is using `.env.olddev` configuration file with feature flags
PUBLIC_URL='https://staging.oasis.app/trade-old' yarn build:ci-dev-old

# Deploy to AWS
sudo apt update
sudo apt install python-pip
pip install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.region $STAGING_AWS_REGION
aws configure set default.output json
aws configure set aws_access_key_id $STAGING_AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $STAGING_AWS_SECRET_ACCESS_KEY

aws --profile default s3 sync ./build s3://$STAGING_AWS_BUCKET_NAME/trade-old/ --delete
aws --profile default cloudfront create-invalidation --distribution-id $STAGING_AWS_CF_ID --paths "/*"

