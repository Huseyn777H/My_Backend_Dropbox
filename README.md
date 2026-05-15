# Serverless Dropbox

Small Dropbox-like project for the Qwasar backend/serverless subject.

Hosted URL: http://my-backend-dropbox-huseyn777h-20260515.s3-website.eu-north-1.amazonaws.com

Vercel URL: https://my-backend-dropbox-subject-1-soluti.vercel.app

## What it does

- User authentication with Amazon Cognito.
- Upload files to S3.
- List, download and delete uploaded files.
- Keep old file copies in a `.versions` folder when a file is replaced.
- Use Lambda functions for S3 create/delete events.
- Store simple file event metadata in DynamoDB.

## Stack

- React + Vite
- AWS Amplify
- Cognito
- S3
- Lambda
- DynamoDB

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The UI can open without AWS config, but upload/download actions need `src/aws-exports.js`.

## AWS setup notes

This repo keeps the Lambda source code in `amplify/backend/function/`.

Basic Amplify flow:

```bash
amplify init
amplify add auth
amplify add storage
amplify add function
amplify push
```

For AWS Amplify hosting:

```bash
amplify add hosting
amplify publish
```

For this submission I deployed the React frontend on AWS S3 static website hosting and connected it to Cognito + an S3 storage bucket. `src/aws-exports.js` is generated locally and ignored by git, so run the backend deploy script before rebuilding from a fresh clone.

```bash
python scripts/deploy_aws_backend.py
npm run build
```

## Folder structure

```text
src/
  App.jsx
  components/
    AmplifyBootstrap.jsx
    FileList.jsx
    FileList.css
    FileUploader.jsx
    FileUploader.css
    VersionTimeline.jsx
    VersionTimeline.css
    Workspace.jsx
    Workspace.css
  hooks/
    useFiles.js
  utils/
    formatters.js

amplify/
  backend/
    function/
      archiveFileVersion/
      recordFileDelete/
```

## Notes

- `node_modules/` is ignored.
- Generated build files are ignored.
- One React component per file.
- CSS files are kept next to their component.
