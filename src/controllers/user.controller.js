import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {User} from "../models/user.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()         
        
        user.refreshToken = refreshToken  //  store refresh token in database
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error)
     { 
        throw new ApiError (500, "Something went wrong while generating the refresh and access tokens")
        
    }
}


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

    console.log("Register user controller called");
    const{username, fullname, email, password} =req.body 
    console.log(` Taking username:
         ${username}, 
         and
         email: ${email}`);

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
   const createdUser =  await User.findById(user._id).select("-password -refreshToken")  // Exclude password and refreshToken from the response
    if (!createdUser) {
        throw new ApiError(500, "User registering failed");
    }
    return res.status(200).json(
        new ApiResponce(        
        200,createdUser, "User registered successfully"
        )        
    )     

})
 
  
const loginUser = asyncHandler(async(req, res) => {
    //-----------get these data----------->
    // get data from req body
    // check username or email
    // find the user
    // password cheeck
    // generate access and generate refresh token
    // send these into cookies

    
    const{username, email, password} = req.body
    console.table(req.body);
    
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404, "user does not exist")
    }
    // Check if the password is correct
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user creadential");
        
    }

    // Generate access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const logInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true, // Set to true if using HTTPS
    }

    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .status(200)
        .json(new ApiResponce(200, 
            {
                user: logInUser, accessToken, refreshToken
            },
             "User logged in successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
    // Clear the refresh token from the user's record in the database
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true, // Return the updated user document
        }
    )
     const options = {
        httpOnly: true,
        secure: true, 
    }
    return res
        .status(200)
        .cookie("accessToken","", options)
        .cookie("refreshToken","",options) 
        .json(new ApiResponce(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async( req, res) => 
    {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        //console.log(`Decoded Token: ${JSON.stringify(decodedToken)}`);
        
        const user = await User.findById(decodedToken?._id)
        //console.log(`User found: ${user ? user._id : 'No user found'}`);
        
           
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }

        // console.log(`Incoming Refresh Token: ${incomingRefreshToken}`);
        // console.log(`User's Refresh Token: ${user?.refreshToken}`);
        
        
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options ={
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken: newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
        //console.log(` New Refresh Token: ${newrefreshToken}`);
        
        return res.status(201)
        .cookie("accessToken", accessToken,options)
        .cookie("refreshToken", newrefreshToken,options)
        .json(
            new ApiResponce(
                200,
                {accessToken,refreshToken: newrefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
        
    // const {oldPassword, newPassword,confPassword} = req.body  
    // if (!(confPassword===newPassword)){
    //     throw new ApiError(400, "password not match")
    // }
    
    const {oldPassword, newPassword} = req.body
    //console.log(`Old Password: ${oldPassword}, New Password: ${newPassword}`);
       
    
    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password cannot be the same as the old password"); 
    }
    //
    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordTrue = await user.isPasswordCorrect(oldPassword)
   // console.log(isPasswordCorrect); // return true or false
    

    if(!isPasswordTrue){
        throw new ApiError(400, "Invalid old password")
    }

    user.password= newPassword  // save new passwrd into database 

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponce(200,{}, "Password changed successfully"))


})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res.status(200)
    .json(200,req.user,"Current user fetched successfully")
})
const updateAccountDetails =asyncHandler(async(req,res) => {
    const {fullname,email} =req.body

    if(!(fullname || email)){
        throw new ApiError(400,"All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}

    ).select("-password")

    return res.status(200)
    .json(new ApiResponce(200,user," Account details updated successfully "))
})

const updateAvatar = asyncHandler(async(req,res) =>  {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400," avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },{new: true }
    ).select("-password")

    return res.status(200)
    .json(200,user,"Avatar Image Updated Successfully")

})
const updateCoverImage = asyncHandler(async(req,res) =>  {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400," Coverimage file is missing")
    }
    const coverimage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverimage.url){
        throw new ApiError(400,"Error while uploading on coverimage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverimage.url
            }
        },{new: true }
    ).select("-password")

    return res.status(200)
    .json(200,user," CoverImage Updated Successfully")


})

const getUserChannelProfile = asyncHandler(async(req,res) => {
   const{username} = req.params;

   if(!username) {
    throw new ApiError(400, "Username is missing");
   }
   const channel = await User.aggregate([
    {
        $match: username?.username.lowercase()
   },
   {
    $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subsccribers"
    }
   },
   {
    $lookup: {
        from: "subscripions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedto"
    }
   },
   {
    $addFields: {
        subscribersCount: {
            $size: "$subscribers"
        },        
        channelSubscribedToCount: {
            $size: "$subscribedto"
            
        },
        isSubscribed: {
            $cond: {
            if: {
                $in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
            }
        }
    }
   },
    {
        $project: {
            fullname:1,
            username: 1,
            subscribersCount: 1,
            channelSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1, 
            coverImage: 1,
            email: 1,
        }
    }
])
    if(!channel || channel.length === 0) {
     throw new ApiError(404, "Channel not found");
    }
    
    return res.status(200)
    .json(new ApiResponce(200, channel[0], "User channel profile fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req, res) => {

    const userId = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {                
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistoryVideos",
                    pipeline:[
                        {
                            $lookup:{
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "ownedetails",
                                pipeline:[
                                    {
                                        $project: {
                                            fullname: 1,
                                            username: 1,
                                            avatar: 1,

                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {  // find 1st value from array in database
                                owner:{
                                    $first: "$ownerdetails"
                                }
                            }
                        }
                    ]             
            }
        }
    ])
     return res
     .status(200)
     .json(
        new ApiResponce(
            200, userId[0]?.watchHistory,"Watch history fetched successfully"
         )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,

 };

