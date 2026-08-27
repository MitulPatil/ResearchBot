export function errorHandler(err,req,res,next){
    console.log("Error",err.next);
    console.log(err.stack);
    
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        status : "error",
        messsage : err.message || "Internal Servar Error"
    })
}