import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = new S3Client({
    region: "af-south-1",
    ...(process.env.NODE_ENV === 'production' && {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    })
  });

  async function checkDateFolder(dateString) {
    const command = new ListObjectsV2Command({
      Bucket: "peterm790",
      Prefix: `petesforecast/wind/${dateString}/`,
      Delimiter: '/',
      MaxKeys: 1
    });

    try {
      const response = await client.send(command);
      return response.CommonPrefixes && response.CommonPrefixes.length > 0;
    } catch (error) {
      console.error(`Error checking folder for ${dateString}:`, error);
      return false;
    }
  }

  function getDateString(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  try {
    const today = new Date();
    for (let i = 0; i < 2; i++) {
      const dateString = getDateString(today);
      if (await checkDateFolder(dateString)) {
        return res.status(200).json({ extractedDate: dateString });
      }
      today.setDate(today.getDate() - 1); // Move to previous day
    }

    // If neither today nor yesterday's folder exists, fall back to finding the latest folder
    const latestFolder = await getLatestFolder(client);
    const dateMatch = latestFolder.match(/\/(\d{8})\//);
    const extractedDate = dateMatch ? dateMatch[1] : null;
    return res.status(200).json({ extractedDate });
  } catch (error) {
    console.error("Error fetching latest data URL:", error);
    return res.status(500).json({ error: "Failed to fetch latest data URL" });
  }
}

async function getLatestFolder(client) {
  const command = new ListObjectsV2Command({
    Bucket: "peterm790",
    Prefix: "petesforecast/wind/",
    Delimiter: "/",
    MaxKeys: 1,
  });

  try {
    const response = await client.send(command);
    const folders = response.CommonPrefixes ? response.CommonPrefixes.map(prefix => prefix.Prefix) : [];
    const latestFolder = folders.sort().pop();
    return latestFolder;
  } catch (error) {
    console.error("Error fetching latest folder:", error);
    throw error;
  }
}
