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

// accepting the json data  from the request body
app.use(express.json({limit: "16kb"})); // Limit request body size to 16kb

// accept url-encoded data using urlencoded
app.use(express.urlencoded({extended: true, limit: "16kb"})); // Limit URL-encoded data to 16kb

// create public folder to serve static files
app.use(express.static('public')); 

// acess the user cookies and  set them using cookies parser  
app.use(cookieParser())






export { app };