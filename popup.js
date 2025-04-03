document.addEventListener('DOMContentLoaded', () => {
  const scrapeButton = document.getElementById('scrapeButton');
  const downloadButton = document.getElementById('downloadButton');
  const statusDiv = document.getElementById('status');
  const productCountSpan = document.getElementById('productCount');
  const productListDiv = document.getElementById('productList');

  let scrapedProducts = [];

  // Load initial data from storage
  chrome.storage.local.get(['scrapedProducts'], (result) => {
    if (result.scrapedProducts) {
      scrapedProducts = result.scrapedProducts;
      updateUI();
    }
  });

  scrapeButton.addEventListener('click', () => {
    setStatus('Scraping...', 'info');
    scrapeButton.disabled = true;

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        setStatus('Could not find active tab.', 'error');
        scrapeButton.disabled = false;
        return;
      }
      // Send message to content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProduct' }, (response) => {
        scrapeButton.disabled = false;
        if (chrome.runtime.lastError) {
          // Handle errors like content script not injected
          setStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
          console.error(chrome.runtime.lastError);
        } else if (response && response.error) {
          setStatus(`Scraping error: ${response.error}`, 'error');
          console.error('Scraping error:', response.error);
        } else if (response) {
          // Check if product already exists (by ASIN)
          const existingIndex = scrapedProducts.findIndex(p => p.asin === response.asin);
          if (existingIndex === -1) {
            scrapedProducts.push(response);
          } else {
            // Optionally update existing product data
            scrapedProducts[existingIndex] = response; 
          }
          
          // Save to storage
          chrome.storage.local.set({ scrapedProducts }, () => {
            setStatus('Product scraped successfully!', 'success');
            updateUI();
          });
        } else {
           setStatus('No response from content script.', 'error');
        }
      });
    });
  });

  downloadButton.addEventListener('click', () => {
    if (scrapedProducts.length === 0) {
      setStatus('No data to download.', 'error');
      return;
    }

    const dataStr = JSON.stringify(scrapedProducts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `amazon_products_${timestamp}.json`;

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true // Prompt user for save location
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        setStatus(`Download error: ${chrome.runtime.lastError.message}`, 'error');
        console.error('Download error:', chrome.runtime.lastError);
      } else {
        setStatus('Download initiated.', 'success');
        // Optional: Clear data after download?
        // scrapedProducts = [];
        // chrome.storage.local.set({ scrapedProducts }, updateUI);
      }
      // Revoke the object URL to free up resources
      URL.revokeObjectURL(url);
    });
  });

  function updateUI() {
    productCountSpan.textContent = scrapedProducts.length;
    downloadButton.disabled = scrapedProducts.length === 0;
    productListDiv.innerHTML = ''; // Clear previous list

    if (scrapedProducts.length > 0) {
      productListDiv.style.display = 'block';
      scrapedProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.textContent = `${product.title || 'No Title'} (ASIN: ${product.asin || 'N/A'})`;
        productListDiv.appendChild(item);
      });
    } else {
      productListDiv.style.display = 'none';
    }
  }

  function setStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    // Hide status after a few seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}); 