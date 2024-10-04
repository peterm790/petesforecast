import type { NextApiRequest, NextApiResponse } from 'next';

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

const s3Client = new S3Client({ region: "af-south-1" });

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

  const response = await s3Client.send(command);
  if (response.Body instanceof Readable) {
    return streamToBuffer(response.Body);
  } else {
    throw new Error('Unexpected response body type');
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

    // Process jsonData and imgBuffer as needed
    // For example, you might want to send the image as base64
    const imgBase64 = imgBuffer.toString('base64');

    // Return the JSON data along with the base64 image
    res.status(200).json({
      jsonData: jsonData,
      imgData: imgBase64
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}