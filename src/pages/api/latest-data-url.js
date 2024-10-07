import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = new S3Client({
    region: "af-south-1",
  });

  const command = new ListObjectsV2Command({
    Bucket: "peterm790",
    Prefix: "petesforecast/wind/",
    Delimiter: "/",
  });

  try {
    console.log("Fetching latest data URL");
    const response = await client.send(command);
    console.log("Response:", response);
    const folders = response.CommonPrefixes.map(prefix => prefix.Prefix);
    console.log("Folders:", folders);
    const latestFolder = folders.sort().pop();
    console.log("Latest folder:", latestFolder);
    const dateMatch = latestFolder.match(/\/(\d{8})\//);
    console.log("Date match:", dateMatch);
    const extractedDate = dateMatch ? dateMatch[1] : null;
    console.log("Extracted date:", extractedDate);
    return res.status(200).json({ extractedDate });
  } catch (error) {
    console.error("Error fetching latest data URL:", error);
    return res.status(500).json({ error: "Failed to fetch latest data URL" });
  }
}