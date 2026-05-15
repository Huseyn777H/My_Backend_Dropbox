import json
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

PROFILE = "Huseyn_77"
REGION = "eu-north-1"
PROJECT = "serverless-dropbox"
STORAGE_BUCKET = "serverless-dropbox-files-huseyn777h-20260515"
HOSTING_BUCKET = "my-backend-dropbox-huseyn777h-20260515"
FRONTEND_URL = f"http://{HOSTING_BUCKET}.s3-website.{REGION}.amazonaws.com"
VERCEL_URL = "https://my-backend-dropbox-subject-1-soluti.vercel.app"


def find_user_pool(cognito):
    paginator = cognito.get_paginator("list_user_pools")
    for page in paginator.paginate(MaxResults=60):
        for pool in page["UserPools"]:
            if pool["Name"] == f"{PROJECT}-users":
                return pool["Id"]
    return None


def get_or_create_user_pool(cognito):
    user_pool_id = find_user_pool(cognito)
    if user_pool_id:
        return user_pool_id

    response = cognito.create_user_pool(
        PoolName=f"{PROJECT}-users",
        AutoVerifiedAttributes=["email"],
        UsernameAttributes=["email"],
        Policies={
            "PasswordPolicy": {
                "MinimumLength": 8,
                "RequireUppercase": False,
                "RequireLowercase": False,
                "RequireNumbers": False,
                "RequireSymbols": False,
            }
        },
        AccountRecoverySetting={
            "RecoveryMechanisms": [{"Priority": 1, "Name": "verified_email"}]
        },
    )
    return response["UserPool"]["Id"]


def get_or_create_user_pool_client(cognito, user_pool_id):
    clients = cognito.list_user_pool_clients(UserPoolId=user_pool_id, MaxResults=60)
    for client in clients["UserPoolClients"]:
        if client["ClientName"] == f"{PROJECT}-web":
            return client["ClientId"]

    response = cognito.create_user_pool_client(
        UserPoolId=user_pool_id,
        ClientName=f"{PROJECT}-web",
        GenerateSecret=False,
        ExplicitAuthFlows=[
            "ALLOW_USER_SRP_AUTH",
            "ALLOW_USER_PASSWORD_AUTH",
            "ALLOW_REFRESH_TOKEN_AUTH",
        ],
        SupportedIdentityProviders=["COGNITO"],
        PreventUserExistenceErrors="ENABLED",
    )
    return response["UserPoolClient"]["ClientId"]


def get_or_create_identity_pool(identity, user_pool_id, client_id):
    provider_name = f"cognito-idp.{REGION}.amazonaws.com/{user_pool_id}"
    response = identity.list_identity_pools(MaxResults=60)
    for pool in response["IdentityPools"]:
        if pool["IdentityPoolName"] == f"{PROJECT}-identity":
            return pool["IdentityPoolId"]

    response = identity.create_identity_pool(
        IdentityPoolName=f"{PROJECT}-identity",
        AllowUnauthenticatedIdentities=False,
        CognitoIdentityProviders=[
            {
                "ProviderName": provider_name,
                "ClientId": client_id,
                "ServerSideTokenCheck": False,
            }
        ],
    )
    return response["IdentityPoolId"]


def get_or_create_role(iam, role_name, trust_policy):
    try:
        return iam.get_role(RoleName=role_name)["Role"]["Arn"]
    except ClientError as error:
        if error.response["Error"]["Code"] != "NoSuchEntity":
            raise

    response = iam.create_role(
        RoleName=role_name,
        AssumeRolePolicyDocument=json.dumps(trust_policy),
        Description=f"{PROJECT} role",
    )
    return response["Role"]["Arn"]


def configure_identity_roles(identity, iam, identity_pool_id):
    authenticated_role_name = "serverless-dropbox-auth-role"
    unauthenticated_role_name = "serverless-dropbox-guest-role"
    common_condition = {
        "StringEquals": {"cognito-identity.amazonaws.com:aud": identity_pool_id},
    }

    auth_trust = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Federated": "cognito-identity.amazonaws.com"},
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    **common_condition,
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    },
                },
            }
        ],
    }
    guest_trust = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Federated": "cognito-identity.amazonaws.com"},
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    **common_condition,
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "unauthenticated"
                    },
                },
            }
        ],
    }

    auth_arn = get_or_create_role(iam, authenticated_role_name, auth_trust)
    guest_arn = get_or_create_role(iam, unauthenticated_role_name, guest_trust)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["s3:ListBucket"],
                "Resource": f"arn:aws:s3:::{STORAGE_BUCKET}",
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:AbortMultipartUpload",
                ],
                "Resource": f"arn:aws:s3:::{STORAGE_BUCKET}/*",
            },
        ],
    }
    iam.put_role_policy(
        RoleName=authenticated_role_name,
        PolicyName="serverless-dropbox-storage",
        PolicyDocument=json.dumps(policy),
    )

    identity.set_identity_pool_roles(
        IdentityPoolId=identity_pool_id,
        Roles={"authenticated": auth_arn, "unauthenticated": guest_arn},
    )


def get_or_create_bucket(s3):
    try:
        s3.head_bucket(Bucket=STORAGE_BUCKET)
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code")
        if code not in {"404", "NoSuchBucket", "NotFound"}:
            raise
        s3.create_bucket(
            Bucket=STORAGE_BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )

    s3.put_bucket_versioning(
        Bucket=STORAGE_BUCKET,
        VersioningConfiguration={"Status": "Enabled"},
    )
    s3.put_bucket_cors(
        Bucket=STORAGE_BUCKET,
        CORSConfiguration={
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": ["*"],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        },
    )


def write_aws_exports(user_pool_id, client_id, identity_pool_id):
    config = {
        "aws_project_region": REGION,
        "aws_cognito_region": REGION,
        "aws_user_pools_id": user_pool_id,
        "aws_user_pools_web_client_id": client_id,
        "aws_cognito_identity_pool_id": identity_pool_id,
        "aws_cognito_username_attributes": ["EMAIL"],
        "aws_cognito_signup_attributes": ["EMAIL"],
        "aws_cognito_mfa_configuration": "OFF",
        "aws_cognito_password_protection_settings": {
            "passwordPolicyMinLength": 8,
            "passwordPolicyCharacters": [],
        },
        "aws_cognito_verification_mechanisms": ["EMAIL"],
        "aws_user_files_s3_bucket": STORAGE_BUCKET,
        "aws_user_files_s3_bucket_region": REGION,
        "aws_mandatory_sign_in": "enable",
    }
    output = "const awsmobile = "
    output += json.dumps(config, indent=2)
    output += ";\n\nexport default awsmobile;\n"
    Path("src/aws-exports.js").write_text(output, encoding="utf-8")


def main():
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    cognito = session.client("cognito-idp")
    identity = session.client("cognito-identity")
    iam = session.client("iam")
    s3 = session.client("s3")

    user_pool_id = get_or_create_user_pool(cognito)
    client_id = get_or_create_user_pool_client(cognito, user_pool_id)
    identity_pool_id = get_or_create_identity_pool(identity, user_pool_id, client_id)
    get_or_create_bucket(s3)
    configure_identity_roles(identity, iam, identity_pool_id)
    write_aws_exports(user_pool_id, client_id, identity_pool_id)

    print(f"userPoolId={user_pool_id}")
    print(f"userPoolClientId={client_id}")
    print(f"identityPoolId={identity_pool_id}")
    print(f"storageBucket={STORAGE_BUCKET}")


if __name__ == "__main__":
    main()
