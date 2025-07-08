import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId, mongo } from "mongoose";

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

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!req.user || !isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid or missing userId");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {

                        $lookup: {
                            from:"subscriptions",
                            localField: "_id",
                            foreignField:"channel",
                            as: "subscribers"

                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {$size: "$subscribers"},
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user._id, "$subscribers.subscriber"],
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ] 
            }
        },
        {
            $addFields: {
                likesCount: {$size: "$likes" },
                owner: { $first: "$owner"},
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video || video.length === 0) {
        throw new ApiError(404, "Video not found");
    }

    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    // Add video to user's watch history
    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { watchHistory: videoId }
    });

    return res.status(200).json(
        new ApiResponce(200, video[0], "Video details fetched successfully")
    );
})


// update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!(title && description)) {
        throw new ApiError(400, "title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't edit this video as you are not the owner"
        );
    }

    //deleting old thumbnail and updating with new one
    const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(400, "thumbnail not found");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video please try again");
    }

    if (updatedVideo) {
        await deleteOnCloudinary(thumbnailToDelete);
    }

    return res
        .status(200)
        .json(new ApiResponce(200, updatedVideo, "Video updated successfully"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
   if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't delete this video as you are not the owner"
        );
    }

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if (!videoDeleted) {
        throw new ApiError(400, "Failed to delete the video please try again");
    }

    await deleteOnCloudinary(video.thumbnail.public_id); // video model has thumbnail public_id stored in it->check videoModel
    await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

    // delete video likes
    await Like.deleteMany({
        video: videoId
    })

     // delete video comments
    await Comment.deleteMany({
        video: videoId,
    })
    
    return res
        .status(200)
        .json(new ApiResponce(200, {}, "Video deleted successfully"));
});

// toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't toogle publish status as you are not the owner"
        );
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                { isPublished: toggledVideoPublish.isPublished },
                "Video publish toggled successfully"
            )
        );
});




export {
    uploadVideo,
    getAllVideos,    
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}