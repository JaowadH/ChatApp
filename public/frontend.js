document.addEventListener("DOMContentLoaded", () => {
  // Open WebSocket with userId query
  const webSocket = new WebSocket(`ws://${window.location.host}/ws?userId=${window.userId}`);

  // Once connected, mark all existing messages as read
  webSocket.addEventListener("open", () => {
    webSocket.send(JSON.stringify({ type: "markRead" }));
  });

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatBox = document.getElementById("chat-box");
  const typingStatus = document.getElementById("typing-status");
  const onlineUsers = document.getElementById("online-users");
  const userCount = document.getElementById("user-count");

  // Globals from EJS
  const currentUsername = window.username || "anonymous";

  // Format timestamps: supports ISO strings or already-formatted times
  function formatTime(input) {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      // input might already be a readable time string
      return input;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Avatar initials
  function getInitials(name) {
    return name.charAt(0).toUpperCase();
  }

  // Render one message
  function renderMessage({ messageId, sender, message, timestamp, status = "sent", readBy = [] }) {
    const isOwn = sender === currentUsername;
    const wrapper = document.createElement("div");
    wrapper.className = `flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`;
    wrapper.dataset.id = messageId;

    wrapper.innerHTML = `
      <div class="max-w-xs md:max-w-md ${isOwn ? "text-right" : ""}">
        <div class="flex ${isOwn ? "flex-row-reverse justify-end" : "items-center space-x-2"}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isOwn ? "bg-blue-600 text-white" : "bg-gray-500 text-white"
          }">${getInitials(sender)}</div>
          <div class="${
            isOwn ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          } px-4 py-2 rounded-lg ${isOwn ? "rounded-br-none" : "rounded-bl-none"}">
            ${message}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          ${status} • ${formatTime(timestamp)}
          ${isOwn && readBy.length > 0 ? ` • Read by: ${readBy.join(", ")}` : ""}
        </div>
      </div>
    `;

    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Update a message bubble when another user marks it read
  function updateReadReceipt(messageId, reader) {
    const msgDiv = chatBox.querySelector(`[data-id="${messageId}"]`);
    if (!msgDiv) return;

    let receiptEl = msgDiv.querySelector('.read-receipt');
    if (!receiptEl) {
      receiptEl = document.createElement('div');
      receiptEl.className = 'read-receipt text-xs text-gray-500 dark:text-gray-400 italic mt-1';
      msgDiv.appendChild(receiptEl);
    }

    const existing = receiptEl.textContent.replace('Read by: ', '').split(', ').filter(Boolean);
    if (!existing.includes(reader)) {
      existing.push(reader);
      receiptEl.textContent = 'Read by: ' + existing.join(', ');
    }
  }

  // Send new message
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    webSocket.send(JSON.stringify({ type: "message", message: text }));
    chatInput.value = "";
  });

  // Handle incoming events
  webSocket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "message":
        renderMessage(data);
        if (data.sender !== currentUsername) {
          webSocket.send(JSON.stringify({ type: "markRead" }));
        }
        break;
      case "typing":
        typingStatus.innerText = `${data.username} is typing...`;
        setTimeout(() => (typingStatus.innerText = ""), 1500);
        break;
      case "onlineCount":
        userCount.innerText = data.total;
        break;
      case "readReceipt":
        updateReadReceipt(data.messageId, data.reader);
        break;
      default:
        break;
    }
  });

  // Emit typing events
  chatInput.addEventListener("input", () => {
    webSocket.send(JSON.stringify({ type: "typing" }));
  });
});
