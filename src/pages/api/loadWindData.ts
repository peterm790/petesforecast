import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage } from 'http';
import { request } from 'https';

type ResponseData = {
  jsonData?: any;
  imgData?: string;
  error?: string;
};

async function fetchFromS3ViaHttps(key: string): Promise<Buffer> {
  const bucketName = "peterm790";
  const region = "af-south-1";
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return new Promise((resolve, reject) => {
    request(url, (res: IncomingMessage) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${key}, status code: ${res.statusCode}`));
        return;
      }

      const data: Uint8Array[] = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', (err) => reject(err)).end();
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { forecast = '', resolution = '' } = req.query;

  try {
    const jsonBuffer = await fetchFromS3ViaHttps("test.json");
    const imgBuffer = await fetchFromS3ViaHttps("test.png");

    const jsonData = jsonBuffer.toString('utf-8');
    const imgBase64 = imgBuffer.toString('base64');

    console.log(jsonData);
    console.log(imgBase64);

    res.status(200).json({
      jsonData: jsonData,
      imgData: imgBase64
    });
  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ error: 'Failed to load data: ' + (error instanceof Error ? error.message : String(error)) });
  }
}