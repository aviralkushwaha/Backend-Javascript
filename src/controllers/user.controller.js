import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {User} from "../models/user.model.js";


const registerUser = asyncHandler(async (req, res) => {
    // get user details from request body or frontend
    // validate the user details - not empaty
    // check if user already exists in the database: username or email
    // check for images,check for avatar
    // upload them to cloudinary, avatar
    // create user object -create entry in db
    // remove password and refresh token field from user object before sending response
    // check for user creation 
    // return response


    
    const{username, fullname, email, password} =req.body 
    console.log(`username: ${username}, email: ${email}`);

    if(
        [fullname, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Here you would typically check if the user already exists in the database
    // For example, using a User model with a findOne method
    const existUser = await User.findOne({
        $or: [{username}, {email}]
    })    
    
    if (existUser) {
        throw new ApiError(409, "User already exists with this username or email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path; // Ensure that the avatar file is uploaded
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if (!avatarLocalPath) 
         {
        throw new ApiError(400, "Avatar image is required");
    }
        
    const avatarCloud = await uploadOnCloudinary(avatarLocalPath)   
    if (!avatarCloud) {
        throw new ApiError(500, "Failed to upload avatar image");
    }   
    const coverImageCloud = await uploadOnCloudinary(coverImageLocalPath)



    // Create a new user object with the provided details
    const user = await User.create({
        fullname,
        avatar: avatarCloud?.url,        
        coverImage: coverImageCloud?.url || "",
        username: username.toLowerCase(),
        email,
        password, // Ensure to hash the password before saving it
})
    
    // Check if user was created successfully
   const createdUser =  await User.findById(user._id).select
   ("-password -refreshToken")  // Exclude password and refreshToken from the response
    if (!createdUser) {
        throw new ApiError(500, "User registering failed");
    }
    return res.status(200).json(
        new ApiResponce(        
        200,createdUser, "User registered successfully",
        console.log("User regisation success"))        
    )     

})


export { registerUser };

