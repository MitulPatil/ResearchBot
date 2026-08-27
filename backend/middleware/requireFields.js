export function requireFields(fields){
    return function(req,res,next){
        for(const field of fields){
            if(
                req.body[field] === undefined ||
                req.body[field] === null ||
                req.body[field] === ""
            ){
                const err = new Error(`${field} field required`);
                err.status = 400;
                return next(err);
            }
        }

        next();
    }
}