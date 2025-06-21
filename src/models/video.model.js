import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// Register the plugin
const videoSchema = new Schema({
    videoFile: {
        type: {
               url: String,
               public_id: String,
            },
            required: [true, "video file is required"],
    },
    title: {
        type: String,
        required: [true, "tittle is required"],
              
    },
    thumbnail: {
        type: {
               url: String,
               public_id: String,
            },
            required: true,
    },
    description: {
        type: String,
        required: [true, "description is required"],
        trim: true,        
    },
    duration: {
            type: Number, 
            required: true
        },
    views: {
            type: Number,
            default: 0
        },
    isPublished: {
            type: Boolean,
            default: true
        },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",        
    }



},{timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema)