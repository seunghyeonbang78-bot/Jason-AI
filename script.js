// GitHub Pages에 공개되어도 안전한 파일입니다.
// OpenAI API 키는 절대 이 파일에 넣지 마세요.
const API_BASE_URL = "http://localhost:3000";

const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const sendButton = document.querySelector("#send-button");

function getSessionId() {
  let id = localStorage.getItem("my-ai-session-id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("my-ai-session-id", id);
  }

  return id;
}

function addMessage(role, text) {
  const message = document.createElement("p");
  message.className = `message ${role}`;
  message.textContent = text;
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";
  input.disabled = true;
  sendButton.disabled = true;

  const pending = addMessage("assistant", "생각 중...");

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: getSessionId(),
        message: text,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "요청에 실패했습니다.");
    }

    pending.textContent = body.reply;
  } catch (error) {
    pending.textContent = `오류: ${error.message}`;
  } finally {
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }
});
