// Constants
const MESSAGES = {
  API_KEY_SET: "API Key is set. Enter a new key to update.",
  API_KEY_REQUIRED: "Please enter your OpenAI API Key to start.",
  API_KEY_SAVED: "API Key saved!",
  API_KEY_INVALID: "Invalid API key format. Key should start with 'sk-'",
  COPY_SUCCESS: "Emoji copied to clipboard!",
  COPY_ERROR: "Failed to copy emoji. ",
  DEFAULT_MESSAGE: "Highlight text and select 'Find Emoji' to start."
};

const TIMEOUTS = {
  SUCCESS: 1500,
  ERROR: 2000
};

// Validate API key format
function isValidApiKey(apiKey) {
  return apiKey && 
         apiKey.startsWith('sk-') && 
         apiKey.length >= 32;
}

// Sanitize text for display
function sanitizeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    apiKeyInput: document.getElementById("apiKey"),
    statusDiv: document.getElementById("status"),
    saveButton: document.getElementById("saveKey"),
    resultDiv: document.getElementById("result"),
    copyBtn: document.getElementById("copyBtn"),
    loadingDiv: document.getElementById("loading")
  };

  // Prevent form submission
  elements.apiKeyInput.form?.addEventListener('submit', (e) => e.preventDefault());

  // Load initial state
  chrome.storage.local.get("apiKey", (data) => {
    if (data.apiKey) {
      updateStatus(elements.statusDiv, MESSAGES.API_KEY_SET, "success");
      setTimeout(() => elements.statusDiv.classList.remove("success"), TIMEOUTS.SUCCESS);
    } else {
      elements.statusDiv.textContent = MESSAGES.API_KEY_REQUIRED;
    }
  });

  // Save API key
  elements.saveButton.addEventListener("click", () => handleSaveKey(elements));

  // Update popup with emoji status
  chrome.storage.local.get(["emojiStatus", "emojiResult"], (data) => {
    updatePopup(data, elements);
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      chrome.storage.local.get(["emojiStatus", "emojiResult"], (data) => {
        updatePopup(data, elements);
      });
    }
  });

  // Clear API key input on blur if empty
  elements.apiKeyInput.addEventListener('blur', () => {
    if (!elements.apiKeyInput.value.trim()) {
      elements.apiKeyInput.value = '';
    }
  });
});

function updateStatus(statusDiv, message, type = null) {
  statusDiv.textContent = message;
  if (type) {
    statusDiv.classList.add(type);
  }
}

async function handleSaveKey(elements) {
  const { apiKeyInput, statusDiv, saveButton } = elements;
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    updateStatus(statusDiv, MESSAGES.API_KEY_INVALID, "error");
    setTimeout(() => statusDiv.classList.remove("error"), TIMEOUTS.ERROR);
    return;
  }

  if (!isValidApiKey(apiKey)) {
    updateStatus(statusDiv, MESSAGES.API_KEY_INVALID, "error");
    setTimeout(() => statusDiv.classList.remove("error"), TIMEOUTS.ERROR);
    return;
  }

  // Show loading state
  const originalText = saveButton.innerHTML;
  saveButton.innerHTML = `<span class="loading-spinner"></span>Saving...`;
  saveButton.disabled = true;

  try {
    await chrome.storage.local.set({ apiKey });
    updateStatus(statusDiv, MESSAGES.API_KEY_SAVED, "success");
    apiKeyInput.value = "";

    setTimeout(() => {
      statusDiv.classList.remove("success");
      statusDiv.textContent = MESSAGES.API_KEY_SET;
    }, TIMEOUTS.SUCCESS);
  } catch (error) {
    updateStatus(statusDiv, "Failed to save API key. Please try again.", "error");
    setTimeout(() => statusDiv.classList.remove("error"), TIMEOUTS.ERROR);
  } finally {
    // Restore button
    saveButton.innerHTML = originalText;
    saveButton.disabled = false;
  }
}

function updatePopup(data, elements) {
  const { resultDiv, copyBtn, loadingDiv } = elements;

  if (data.emojiStatus === "fetching") {
    loadingDiv.style.display = "block";
    resultDiv.innerHTML = "";
    copyBtn.style.display = "none";
    return;
  }

  loadingDiv.style.display = "none";

  if (data.emojiStatus === "success" && data.emojiResult) {
    displaySuccessState(data.emojiResult, elements);
  } else if (data.emojiStatus === "error") {
    displayErrorState(data.emojiResult, elements);
  } else {
    displayDefaultState(elements);
  }
}

function displaySuccessState(emoji, elements) {
  const { resultDiv, copyBtn, statusDiv } = elements;

  resultDiv.innerHTML = `
    <div>
      <div class="emoji-display">${emoji}</div>
      <div>Suggested Emoji</div>
    </div>
  `;

  copyBtn.style.display = "block";
  setupCopyButton(copyBtn, emoji, statusDiv);
}

function displayErrorState(error, elements) {
  const { resultDiv, copyBtn } = elements;
  
  resultDiv.innerHTML = `
    <div>
      ${error || "Error occurred"}
    </div>
  `;
  copyBtn.style.display = "none";
}

function displayDefaultState(elements) {
  const { resultDiv, copyBtn } = elements;
  
  resultDiv.innerHTML = `
    <div>
      ${MESSAGES.DEFAULT_MESSAGE}
    </div>
  `;
  copyBtn.style.display = "none";
}

function setupCopyButton(copyBtn, emoji, statusDiv) {
  copyBtn.onclick = async () => {
    const originalText = copyBtn.innerHTML;
    
    try {
      await navigator.clipboard.writeText(emoji);
      
      copyBtn.innerHTML = `<span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </span>Copied!`;
      copyBtn.style.backgroundColor = "var(--success-hover)";
      
      updateStatus(statusDiv, MESSAGES.COPY_SUCCESS, "success");
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.backgroundColor = "var(--success)";
        statusDiv.textContent = "";
        statusDiv.classList.remove("success");
      }, TIMEOUTS.SUCCESS);
    } catch (err) {
      updateStatus(statusDiv, MESSAGES.COPY_ERROR + err, "error");
      setTimeout(() => {
        statusDiv.classList.remove("error");
        statusDiv.textContent = "";
      }, TIMEOUTS.ERROR);
    }
  };
}