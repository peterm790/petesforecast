import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  const client = new S3Client({
    region: "af-south-1",
  });

  const command = new ListObjectsV2Command({
    Bucket: "peterm790",
    Prefix: "petesforecast/wind/",
    Delimiter: "/",
  });

  try {
    const response = await client.send(command);
    const folders = response.CommonPrefixes.map(prefix => prefix.Prefix);
    const latestFolder = folders.sort().pop();
    const dateMatch = latestFolder.match(/\/(\d{8})\//);
    const extractedDate = dateMatch ? dateMatch[1] : null;
    res.status(200).json({ extractedDate });
  } catch (error) {
    console.error("Error fetching latest data URL:", error);
    res.status(500).json({ error: "Failed to fetch latest data URL" });
  }
}