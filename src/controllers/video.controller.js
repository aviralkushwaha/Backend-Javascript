import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { Video } from "../models/video.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

// create the video insertion
const uploadVideo = asyncHandler(async(req, res) => {
    
    const{title, description} = req.body 
      

    if([title, description].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "all fields are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;        
    const thumbnailLocalpath = req.files?.thumbnail[0]?.path;    
        
    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required")
       }
    if(!thumbnailLocalpath){
        throw new ApiError(400, "Video file is required")
        }

    const videoCloud =await uploadOnCloudinary(videoLocalPath)
    const thumbnailCloud =await uploadOnCloudinary(thumbnailLocalpath)

        if(!videoCloud.url){
            throw(500, "Failed to upload the video file")
        }
        if(!thumbnailCloud.url){
            throw new ApiError(500, "Failed to upload the thumbnail file")
        }

    const newVideo = await Video.create({
        title: title?.trim(),
        description: description?.trim(),
        duration: videoCloud.duration,
        videoFile: {
            public_id: videoCloud.public_id,
            url: videoCloud.url,            
        },
        thumbnail: {
            url: thumbnailCloud.url,
            public_id: thumbnailCloud.public_id
        },        
        isPublished: true,
        owner: req.user._id
       }
    )
    console.log(" Video file Uploaded success");
    
    return res.status(200)
    .json(new ApiResponce(200,newVideo,"Video file is uploaded."))


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})




export {
    uploadVideo,
    getAllVideos,    
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}