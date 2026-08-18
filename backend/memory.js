import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyProfile } from "./analyzer.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(directory, "data");
const conversationDir = path.join(dataDir, "conversations");
const profilePath = path.join(dataDir, "user_profile.json");

async function ensureDataDirectories() {
  await mkdir(conversationDir, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonAtomically(filePath, data) {
  await ensureDataDirectories();

  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  await writeFile(
    temporaryPath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8"
  );

  await rename(temporaryPath, filePath);
}

export async function loadProfile() {
  return readJson(profilePath, emptyProfile());
}

export async function saveProfile(profile) {
  return writeJsonAtomically(profilePath, profile);
}

function conversationPath(sessionId) {
  return path.join(conversationDir, `${sessionId}.json`);
}

export async function loadConversation(sessionId) {
  return readJson(conversationPath(sessionId), []);
}

export async function saveConversation(sessionId, conversation) {
  // 최근 20개 메시지만 저장해 비용과 데이터 크기를 제한합니다.
  return writeJsonAtomically(
    conversationPath(sessionId),
    conversation.slice(-20)
  );
}
