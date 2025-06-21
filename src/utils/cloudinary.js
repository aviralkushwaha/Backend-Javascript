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
        fs.unlinkSync(localFilePath); 
        return response; // e
        
    }catch (error) {
        fs.unlinkSync(localFilePath); // Delete/remove the localaly saved file if upload fails
        console.error('Error uploading to Cloudinary:', error);  // Log the error
        return null;
    }
}


// Delete image
 const deleteOnCloudinary = async (publicId) => {
    if (!publicId) {
        console.log("No publicId provided for deletion.");
        return null;
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Successfully deleted from Cloudinary: ${publicId}`);
        return result;
    } catch (error) {
        console.log("Cloudinary deletion failed:", error?.message || error);
        return null;
    }
};
export { uploadOnCloudinary, deleteOnCloudinary };
