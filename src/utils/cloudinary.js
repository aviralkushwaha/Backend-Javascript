import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
       // console.log("File uploaded successfully to Cloudinary",response.url);
        fs.unlinkSync(localFilePath); // Delete the local file after upload
        return response; // Return the URL of the uploaded file
        
    }catch (error) {
        fs.unlinkSync(localFilePath); // Delete/remoove the localaly saved file if upload fails
        console.error('Error uploading to Cloudinary:', error);  // Log the error
        return null;
    }
}
export { uploadOnCloudinary };
