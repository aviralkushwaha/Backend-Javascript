const asyncHandler = (requestHAndler) => {
    (res,res,next) => {
        Promise.resolve(requestHAndler(requestHAndler,res,next)).
        catch((err
            
        ) => next(err));
    }
}





export {asyncHandler}