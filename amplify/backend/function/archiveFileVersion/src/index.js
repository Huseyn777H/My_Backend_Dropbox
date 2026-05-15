const { S3Client, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

const metadataTable = process.env.METADATA_TABLE;

exports.handler = async (event) => {
  const records = event.Records || [];

  await Promise.all(records.map(async (record) => {
    const bucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    if (!sourceKey.includes('/dropbox/') || sourceKey.includes('/.versions/')) {
      return;
    }

    const fileName = sourceKey.split('/').pop();
    const ownerPrefix = sourceKey.slice(0, sourceKey.indexOf('/dropbox/') + '/dropbox/'.length);
    const versionStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionKey = `${ownerPrefix}.versions/${fileName}/${versionStamp}-${fileName}`;

    await s3.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURI(`${bucket}/${sourceKey}`),
      Key: versionKey,
      MetadataDirective: 'COPY',
    }));

    if (metadataTable) {
      await dynamodb.send(new PutItemCommand({
        TableName: metadataTable,
        Item: {
          fileKey: { S: sourceKey },
          eventTime: { S: new Date().toISOString() },
          eventType: { S: 'PUT' },
          versionKey: { S: versionKey },
          size: { N: String(record.s3.object.size || 0) },
        },
      }));
    }
  }));

  return { ok: true };
};
