import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb)  {
        cb(null, "./public/temp"); // Specify the directory to save uploaded files
    },
    filename: function (req, file, cb) {
        //const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        //cb(null, uniqueSuffix + "-" + file.originalname); // Create a unique filename
        cb(null, file.originalname); // Use the original filename
    }
});
export  const upload = multer({ storage: storage });