import multer from "multer";

const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null, './images');
    },
    filename: (req,file,cb) => {
        cb(null, file.originalname);
    }
});

export const upload = multer({storage,limits:{
    limits: 2 * 1000 * 1000,
}})