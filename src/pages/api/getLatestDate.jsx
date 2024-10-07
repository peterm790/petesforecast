import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = new S3Client({
    region: "af-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new ListObjectsV2Command({
    Bucket: "peterm790",
    Prefix: "petesforecast/wind/",
    Delimiter: "/",
  });

  try {
    const response = await client.send(command);
    const folders = response.CommonPrefixes ? response.CommonPrefixes.map(prefix => prefix.Prefix) : [];
    const latestFolder = folders.sort().pop();
    const dateMatch = latestFolder.match(/\/(\d{8})\//);
    const extractedDate = dateMatch ? dateMatch[1] : null;
    return res.status(200).json({ extractedDate });
  } catch (error) {
    console.error("Error fetching latest data URL:", error);
    return res.status(500).json({ error: "Failed to fetch latest data URL" });
  }
}