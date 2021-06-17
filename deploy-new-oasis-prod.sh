rm -rf ./build

# This is using `.env.prod` configuration file with feature flags
PUBLIC_URL='https://oazo.io/trade' yarn build

# Push to ghpages branch
cp ./build/200.html ./build/404.html
gh-pages -d ./build

# Deploy to AWS
sudo apt update
sudo apt install python-pip
pip install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.region $OASIS_AWS_REGION
aws configure set default.output json
aws configure set aws_access_key_id $OASIS_AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $OASIS_AWS_SECRET_ACCESS_KEY

aws --profile default s3 sync ./build s3://$OASIS_AWS_BUCKET_NAME/trade/ --delete
aws --profile default cloudfront create-invalidation --distribution-id $OASIS_AWS_CF_ID --paths "/*"

