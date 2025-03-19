chrome.contextMenus.create({
  id: "find-emoji",
  title: "Find Emoji",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "find-emoji") {
    const selectedText = info.selectionText;
    chrome.storage.local.get("apiKey", (data) => {
      if (!data.apiKey) {
        chrome.action.openPopup();
        return;
      }
      fetchEmoji(selectedText, data.apiKey, tab.id);
    });
  }
});

async function fetchEmoji(text, apiKey, tabId) {
  chrome.storage.local.set({ emojiStatus: "fetching", emojiResult: null });

  try {
    // Get API URL based on environment
    const API_URL = chrome.runtime.getManifest().is_production === true 
      ? "https://autoji.vercel.app/api/emoji"
      : "http://localhost:3000/api/emoji";

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ text, apiKey })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    chrome.storage.local.set({ 
      emojiStatus: "success", 
      emojiResult: data.emoji, 
      tabId 
    });
    chrome.action.openPopup();
  } catch (error) {
    chrome.storage.local.set({ 
      emojiStatus: "error", 
      emojiResult: "Failed to fetch emoji. Please try again." 
    });
    chrome.action.openPopup();
  }
}