
import mongoose, {Schema}  from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, "username is required"],
            unique: true,
            trim: true,
            lowercase: true,
            index: true // index for faster search
        },        
        email: {
                type: String,
                required: [true, "email is required"],
                unique: true,
                trim: true,
                lowercase: true,
            },
        fullname: {
            type: String,
            required: [true, "fullname is required"],
            maxlength: 70,
            trim: true,
            index: true  // index for faster search
        },
        avatar: {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        },
        coverImage: {
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }        
        },
        watchHistory:{
            type:Schema.Types.ObjectId,
            ref: "video"
        },
        password: {
            type: String,
            required: [true, "password is required"],
            //minlength: 6,            
        },
        refreshToken: {
            type: String,
            
        },
        
    },
    {
        timestamps: true
    }

)

userSchema.pre("save", async function(next) {
    if (!this.isModified("password"))  return next();  // If the password is not modified, skip hashing    
    
    this.password = await bcrypt.hash(this.password, 10);  // Hash the password before saving it to the database
    next();
}) 

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);  // Compare the provided password with the hashed password in the database
}

// Generate an access token for the user
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username, 
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,{
            expiresIn:  process.env.ACCESS_TOKEN_EXPIRE
        }
    )
}

// Generate a refresh token for the user
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE
        }
    )
}

export const User = mongoose.model("User", userSchema)