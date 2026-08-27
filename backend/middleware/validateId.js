export function validateId(req,res,next){
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        const err = new Error("Id must be positive Integer");
        err.status = 400;
        return next(err);
    }

    if(id <= 0){
        const err = new Error("book Id must be greater than 0");
        err.status = 400;
        return next(err);
    }

    next();
}