import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import { createReply } from "./ai.js";
import { updateProfile } from "./analyzer.js";
import {
  loadConversation,
  loadProfile,
  saveConversation,
  saveProfile
} from "./memory.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing. Add it to backend/.env."
  );
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("This origin is not allowed."));
    }
  })
);

app.use(express.json({ limit: "50kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/chat", async (request, response, next) => {
  try {
    const { sessionId, message } = request.body || {};

    if (
      typeof sessionId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(sessionId)
    ) {
      return response.status(400).json({
        error: "Invalid session."
      });
    }

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return response.status(400).json({
        error: "Message must be 1–4,000 characters."
      });
    }

    const cleanMessage = message.trim();

    const [profile, oldHistory] = await Promise.all([
      loadProfile(),
      loadConversation(sessionId)
    ]);

    const nextProfile = updateProfile(profile, cleanMessage);

    const promptHistory = [
      ...oldHistory,
      {
        role: "user",
        content: cleanMessage
      }
    ];

    const reply = await createReply(promptHistory, nextProfile);

    const nextHistory = [
      ...promptHistory,
      {
        role: "assistant",
        content: reply
      }
    ];

    await Promise.all([
      saveProfile(nextProfile),
      saveConversation(sessionId, nextHistory)
    ]);

    response.json({ reply });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);

  const status = error.status || 500;

  response.status(status).json({
    error:
      status < 500
        ? error.message
        : "The server could not complete this request."
  });
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
