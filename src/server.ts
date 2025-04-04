import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import globalErrorHandler from "./utils/errorHandler";

const app = express();
app.use(bodyParser.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/api", (req, res) => {
  res.send(
    "Mock API is running. Use POST /generate-mock to generate mock data."
  );
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 8000;

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`✅ Mock API running on http://localhost:${PORT}`);
});
