import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import catchAsync from "./utils/catchAsync";
import AppError from "./utils/appError";
import globalErrorHandler from "./utils/errorHandler";
import { generateMockData, parseInterface } from "./utils/mockGenerator";

const app = express();
app.use(bodyParser.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/api", (req, res) => {
  res.send(
    "Mock API is running. Use POST /api/generate-mock to generate mock data."
  );
});

app.post(
  "/api/generate-mock",
  catchAsync(async (req, res, next) => {
    const { interfaceString, count } = req.body;

    // Validate input
    if (!interfaceString || !count) {
      return next(
        new AppError("Please provide an interface string and count.", 400)
      );
    }

    // Parse the interface string
    const parsedInterface = parseInterface(interfaceString);

    if (!parsedInterface) {
      return next(new AppError("Invalid interface string.", 400));
    }

    // Generate mock data
    const mockData = generateMockData(parsedInterface, count);

    res.status(200).json({
      status: "success",
      data: {
        mockData,
      },
    });
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 8000;

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`✅ Mock API running on http://localhost:${PORT}`);
});
