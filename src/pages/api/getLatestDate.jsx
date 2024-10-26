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
    console.log(`Server time: ${today.toISOString()}`);
    
    for (let i = 0; i < 2; i++) {
      const dateString = getDateString(today);
      console.log(`Checking folder for date: ${dateString}`);
      
      const folderExists = await checkDateFolder(dateString);
      console.log(`Folder exists: ${folderExists}`);
      
      if (folderExists) {
        console.log(`Returning date: ${dateString}`);
        return res.status(200).json({ extractedDate: dateString });
      }
      
      today.setDate(today.getDate() - 1); // Move to previous day
    }

    console.log("Today and yesterday folders not found, falling back to getLatestFolder");
    
    // If neither today nor yesterday's folder exists, fall back to finding the latest folder
    const latestFolder = await getLatestFolder(client);
    console.log(`Latest folder found: ${latestFolder}`);
    
    const dateMatch = latestFolder.match(/(\d{8})\//);
    const extractedDate = dateMatch ? dateMatch[1] : null;
    console.log(`Extracted date: ${extractedDate}`);
    
    return res.status(200).json({ extractedDate });
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Failed to fetch latest data URL" });
  }
}

async function getLatestFolder(client) {
  const command = new ListObjectsV2Command({
    Bucket: "peterm790",
    Prefix: "petesforecast/wind/",
    Delimiter: "/",
  });

  try {
    const response = await client.send(command);
    const folders = response.CommonPrefixes
      ? response.CommonPrefixes
          .map(prefix => prefix.Prefix)
          .filter(prefix => /\d{8}\/$/.test(prefix))
      : [];
    
    if (folders.length === 0) {
      throw new Error("No valid date folders found");
    }

    const latestFolder = folders.sort((a, b) => b.localeCompare(a))[0];
    return latestFolder;
  } catch (error) {
    console.error("Error fetching latest folder:", error);
    throw error;
  }
}
