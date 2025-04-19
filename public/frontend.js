document.addEventListener("DOMContentLoaded", () => {
  // Open WebSocket with userId query
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  const loginTime = window.loginTime || new Date().toISOString();

  const webSocket = new WebSocket(
    `${scheme}://${window.location.host}/ws` +
    `?userId=${window.userId}` +
    `&loginTime=${encodeURIComponent(loginTime)}`
  );
  // Once connected, mark all existing messages as read
  webSocket.addEventListener("open", () => {
    webSocket.send(JSON.stringify({ type: "markRead" }));
  });

  // grab DOM nodes
  const chatForm        = document.getElementById("chat-form");
  const chatInput       = document.getElementById("chat-input");
  const chatBox         = document.getElementById("chat-box");
  const typingIndicator = document.getElementById("typing-indicator");
  const typingText      = document.getElementById("typing-text");
  const onlineUsersList = document.getElementById("online-users");
  const userCount       = document.getElementById("user-count");
  const currentUsername = window.username || "anonymous";

  let typingTimeout;

  // helpers
  function formatTime(input) {
    const d = new Date(input);
    return isNaN(d.getTime())
      ? input
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // render a message bubble
  function renderMessage({ messageId, sender, message, timestamp, status = "sent", readBy = [] }) {
    if (sender === "System") {
      const sysMsg = document.createElement("div");
      sysMsg.className = "text-center text-sm text-gray-500 italic animate-fade-in";
      sysMsg.textContent = message;
      chatBox.appendChild(sysMsg);
      chatBox.scrollTop = chatBox.scrollHeight;
      return;
    };    
    const isOwn = sender === currentUsername;
    const wrapper = document.createElement("div");
    wrapper.className = `flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`;
    wrapper.dataset.id = messageId;

    wrapper.innerHTML = `
      <div class="max-w-xs md:max-w-md ${isOwn ? "text-right" : ""}">
        <div class="flex ${isOwn ? "flex-row-reverse justify-end items-center" : "items-center space-x-2"}">
          <!-- Clickable Avatar & Name -->
          <a href="/profile/${sender}" class="flex items-center space-x-2 ${isOwn ? 'space-x-reverse' : ''}">
            <img
              src="https://api.dicebear.com/7.x/fun-emoji/svg?seed=${sender}"
              alt="Avatar for ${sender}"
              class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <span class="text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-900 dark:text-white'}">
              ${sender}
            </span>
          </a>

          <!-- Message Bubble -->
          <div class="${
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
          } px-4 py-2 rounded-lg ${isOwn ? "rounded-br-none" : "rounded-bl-none"}">
            ${message}
          </div>
        </div>

        <!-- Timestamp & Read Receipts -->
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          ${status} • ${formatTime(timestamp)}
          ${isOwn && readBy.length > 0 ? ` • Read by: ${readBy.join(", ")}` : ""}
        </div>
      </div>
    `;

    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // update read receipts
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

  // send new message
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    webSocket.send(JSON.stringify({ type: "message", message: text }));
    chatInput.value = "";
  });

  // incoming WS events
  webSocket.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data);

    switch (msg.type) {
      case "message":
        renderMessage(msg);
        typingIndicator.classList.add("hidden");
        if (msg.sender !== currentUsername) {
          webSocket.send(JSON.stringify({ type: "markRead" }));
        }
        break;

      case "typing":
        typingText.textContent = `${msg.username} is typing…`;
        typingIndicator.classList.remove("hidden");
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          typingIndicator.classList.add("hidden");
        }, 1500);
        break;

      case "onlineUsers":
        // Populate the sidebar with actual users
        onlineUsersList.innerHTML = "";
        msg.users.forEach(user => {
          const li = document.createElement("li");
          li.className = "flex items-center space-x-2";

          li.innerHTML = `
            <a href="/profile/${user.username}" class="flex items-center space-x-2">
              <img
                src="https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.username}"
                alt="Avatar for ${user.username}"
                class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
              />
              <span class="text-gray-900 dark:text-white text-sm font-medium">
                ${user.username}
              </span>
            </a>
          `;

          onlineUsersList.appendChild(li);
        });
        // update total below
        userCount.innerText = msg.users.length;
        break;

      case "onlineCount":
        // fallback count-only update
        userCount.innerText = msg.total;
        break;

      case "readReceipt":
        updateReadReceipt(msg.messageId, msg.reader);
        break;

      default:
        // ignore unknown types
        break;
    }
  });

  // emit typing on input
  chatInput.addEventListener("input", () => {
    webSocket.send(JSON.stringify({ type: "typing" }));
  });
});