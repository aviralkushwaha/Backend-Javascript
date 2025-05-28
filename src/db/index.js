import mongoose from 'mongoose';
import { DB_NAME } from '../constanst.js';

const connectDB  = async () => {
    
    try {
        //console.log("MONGO_URI: ", process.env.MONGO_URI);
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}` )
        //console.log(connectionInstance);
        
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
        

    }catch (error) {        
        console.log("MONGODB connection FAILED : ", error);
        process.exit(1);
        
    }
}
export default connectDB