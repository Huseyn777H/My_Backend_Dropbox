const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});
const metadataTable = process.env.METADATA_TABLE;

exports.handler = async (event) => {
  if (!metadataTable) {
    return { ok: true, skipped: true };
  }

  const records = event.Records || [];

  await Promise.all(records.map(async (record) => {
    const fileKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    await dynamodb.send(new PutItemCommand({
      TableName: metadataTable,
      Item: {
        fileKey: { S: fileKey },
        eventTime: { S: new Date().toISOString() },
        eventType: { S: 'DELETE' },
      },
    }));
  }));

  return { ok: true };
};
