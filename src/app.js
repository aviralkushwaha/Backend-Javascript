import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express()

// congigure the CORS policy
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

//--------- configure the app to parse json data---------------

app.use(express.json({limit: "16kb"})); // Limit request body size to 16kb
app.use(express.urlencoded({extended: true, limit: "16kb"})); // Limit URL-encoded data to 16kb
app.use(express.static('public'));  // create public folder to serve static files
app.use(cookieParser())     // acess the user cookies and  set them using cookies parser  



// routes import
import userRouter from './routes/user.routes.js';
import uploadRouter from "./routes/video.router.js"

// router declaration
app.use("/api/v1/users", userRouter); // use the user router for all user related routes
app.use("/api/v1/users", uploadRouter)



export { app };