document.addEventListener("DOMContentLoaded", () => {
  // Open WebSocket with userId query
  const webSocket = new WebSocket(`ws://${window.location.host}/ws?userId=${window.userId}`);

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
  const onlineUsers     = document.getElementById("online-users");
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

  function getInitials(name) {
    return name.charAt(0).toUpperCase();
  }

  // render message bubbles
  function renderMessage({ messageId, sender, message, timestamp, status = "sent", readBy = [] }) {
    const isOwn = sender === currentUsername;
    const wrapper = document.createElement("div");
    wrapper.className = `flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`;
    wrapper.dataset.id = messageId;
  
    wrapper.innerHTML = `
      <div class="max-w-xs md:max-w-md ${isOwn ? "text-right" : ""}">
        <div class="flex ${isOwn ? "flex-row-reverse justify-end items-center" : "items-center space-x-2"}">
          <!-- DiceBear Avatar -->
          <img
            src="https://api.dicebear.com/7.x/fun-emoji/svg?seed=${sender}"
            alt="Avatar for ${sender}"
            class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
          />
  
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
        // hide typing bubble immediately
        typingIndicator.classList.add("hidden");

        // if from another, echo a read mark
        if (msg.sender !== currentUsername) {
          webSocket.send(JSON.stringify({ type: "markRead" }));
        }
        break;

      case "typing":
        // show typing bubble
        typingText.textContent = `${msg.username} is typing…`;
        typingIndicator.classList.remove("hidden");
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          typingIndicator.classList.add("hidden");
        }, 1500);
        break;

      case "onlineCount":
        userCount.innerText = msg.total;
        break;

      case "readReceipt":
        updateReadReceipt(msg.messageId, msg.reader);
        break;

      default:
        // ignore
        break;
    }
  });

  // emit typing on input
  chatInput.addEventListener("input", () => {
    webSocket.send(JSON.stringify({ type: "typing" }));
  });
});
