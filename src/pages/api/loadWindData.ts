import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';

type ResponseData = {
  jsonData?: any;
  imgData?: string;
  error?: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { forecast = '', resolution = '' } = req.query;

  // Define file paths
  const jsonFilePath = './public/data/wind_20240908_06_1p00_1.json'; 
  const imgFilePath = './public/data/wind_20240908_06_1p00_1.png'; 

  try {
    // Read the JSON file
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');

    // Read the image as a buffer and convert it to a base64 string
    const imgData = await fs.readFile(imgFilePath);
    const imgBase64 = imgData.toString('base64');

    // Return the JSON data along with the base64 image
    res.status(200).json({ jsonData, imgData: imgBase64 });
  } catch (error) {
    console.error('Error loading data:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      error: 'Failed to load data', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}