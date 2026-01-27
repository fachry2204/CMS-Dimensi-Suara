import { ReleaseData } from '../types';

/**
 * MOCK GOOGLE SERVICE
 */

export const uploadReleaseToGoogle = async (data: ReleaseData): Promise<{ success: boolean; message: string }> => {
  return new Promise((resolve) => {
    console.log("Starting Upload Process...");
    
    // Simulate network delay
    setTimeout(() => {
      console.log("1. Uploading Cover Art to Drive...");
      console.log(`   File: ${data.coverArt?.name} (Size: ${data.coverArt?.size})`);
      
      console.log("2. Uploading Audio Files to Drive...");
      data.tracks.forEach(t => {
        console.log(`   Track: ${t.title}, File: ${t.audioFile?.name}`);
      });

      console.log("3. Appending Metadata to Google Sheet...");
      console.log("   Data:", {
        UPC: data.upc,
        Title: data.title,
        Artists: data.primaryArtists.join(", "),
        Country: data.language,
        Date: data.plannedReleaseDate
      });

      resolve({
        success: true,
        message: "Successfully uploaded to Google Drive and synced with Sheets!"
      });
    }, 2000);
  });
};