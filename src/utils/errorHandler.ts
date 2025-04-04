import { Request, Response, NextFunction } from "express";
import AppError from "./appError";

// DEV: Send full error with stack trace
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// PROD: Send clean error
const sendErrorProd = (err: AppError, res: Response) => {
  // Operational error (safe to show to user)
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming/unknown error — log for devs, send generic message to client
    console.error("🔥 UNEXPECTED ERROR:", err);

    res.status(500).json({
      status: "error",
      message: "Something went very wrong.",
    });
  }
};

const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  const env = process.env.NODE_ENV || "development";

  if (env === "development") {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

export default globalErrorHandler;
