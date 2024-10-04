import type { NextApiRequest, NextApiResponse } from 'next';

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

const s3Client = new S3Client({ 
  region: "af-south-1",
  credentials: undefined // This tells the client not to look for credentials
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function fetchFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: "peterm790",
    Key: key,
  });

  try {
    console.log(`Fetching ${key} from S3...`);
    const response = await s3Client.send(command);
    if (response.Body instanceof Readable) {
      const buffer = await streamToBuffer(response.Body);
      console.log(`Successfully fetched ${key}`);
      return buffer;
    } else {
      throw new Error('Unexpected response body type');
    }
  } catch (error) {
    console.error(`Error fetching ${key} from S3:`, error);
    throw error;
  }
}

type ResponseData = {
  jsonData?: any;
  imgData?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { forecast = '', resolution = '' } = req.query;

  try {
    const jsonBuffer = await fetchFromS3("test.json");
    const imgBuffer = await fetchFromS3("test.png");

    const jsonData = jsonBuffer.toString('utf-8');
    const imgBase64 = imgBuffer.toString('base64');

    res.status(200).json({
      jsonData: jsonData,
      imgData: imgBase64
    });
  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ error: 'Failed to load data: ' + (error instanceof Error ? error.message : String(error)) });
  }
}