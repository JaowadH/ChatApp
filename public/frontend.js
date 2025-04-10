const webSocket = new WebSocket("ws://localhost:3000/ws");

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");
const typingStatus = document.getElementById("typing-status");
const onlineUsers = document.getElementById("online-users");
const userCount = document.getElementById("user-count");

// This should be passed from server-side EJS into a script tag
const currentUsername = window.username || "anonymous"; // fallback

// Format timestamps
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Avatar initials
function getInitials(name) {
  return name.charAt(0).toUpperCase();
}

// Render one message
function renderMessage({ sender, message, timestamp, status = "sent", readBy = [] }) {
  const isOwnMessage = sender === currentUsername;

  const msgWrapper = document.createElement("div");
  msgWrapper.className = `flex ${isOwnMessage ? "justify-end" : "justify-start"} animate-fade-in`;

  const messageHTML = `
    <div class="max-w-xs md:max-w-md ${isOwnMessage ? "text-right" : ""}">
      <div class="flex ${isOwnMessage ? "flex-row-reverse justify-end" : "items-center space-x-2"}">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isOwnMessage ? "bg-blue-600 text-white" : "bg-gray-500 text-white"
        }">${getInitials(sender)}</div>
        <div class="${isOwnMessage ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"} px-4 py-2 rounded-lg ${isOwnMessage ? "rounded-br-none" : "rounded-bl-none"}">
          ${message}
        </div>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        ${status} • ${formatTime(timestamp)}
        ${isOwnMessage && readBy.length > 0 ? ` • Read by: ${readBy.join(", ")}` : ""}
      </div>
    </div>
  `;

  msgWrapper.innerHTML = messageHTML;
  chatBox.appendChild(msgWrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle sending messages
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  const payload = {
    type: "message",
    message: text,
  };

  // Optimistically render your own message
  renderMessage({
    sender: currentUsername,
    message: text,
    timestamp: new Date().toISOString(),
    status: "sent",
    readBy: [currentUsername],
  });

  webSocket.send(JSON.stringify(payload));
  chatInput.value = "";
});

// Handle incoming events
webSocket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "message":
      renderMessage(data);
      break;
    case "typing":
      typingStatus.innerText = `${data.username} is typing...`;
      setTimeout(() => (typingStatus.innerText = ""), 1500);
      break;
    case "userList":
      onlineUsers.innerHTML = "";
      data.users.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = user;
        onlineUsers.appendChild(li);
      });
      userCount.textContent = data.users.length;
      break;
  }
});

// Typing indication
chatInput.addEventListener("input", () => {
  webSocket.send(JSON.stringify({ type: "typing" }));
});
