document.addEventListener('DOMContentLoaded', () => {
  const scrapeButton = document.getElementById('scrapeButton');
  const downloadButton = document.getElementById('downloadButton');
  const clearAllButton = document.getElementById('clearAllButton');
  const statusDiv = document.getElementById('status');
  const statusIcon = document.querySelector('.status-icon');
  const statusText = document.querySelector('.status-text');
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
    setStatus('Scraping product...', 'info', '⏳');
    scrapeButton.disabled = true;

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        setStatus('Could not find active tab.', 'error', '❌');
        scrapeButton.disabled = false;
        return;
      }
      // Send message to content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProduct' }, (response) => {
        scrapeButton.disabled = false;
        if (chrome.runtime.lastError) {
          // Handle errors like content script not injected
          setStatus(`Error: ${chrome.runtime.lastError.message}`, 'error', '❌');
          console.error(chrome.runtime.lastError);
        } else if (response && response.error) {
          setStatus(`Scraping error: ${response.error}`, 'error', '❌');
          console.error('Scraping error:', response.error);
        } else if (response) {
          // Check if product already exists (by ASIN)
          const existingIndex = scrapedProducts.findIndex(p => p.asin === response.asin);
          if (existingIndex === -1) {
            scrapedProducts.push(response);
            setStatus('Product added successfully!', 'success', '✓');
          } else {
            // Update existing product data
            scrapedProducts[existingIndex] = response; 
            setStatus('Product updated successfully!', 'success', '✓');
          }
          
          // Save to storage
          chrome.storage.local.set({ scrapedProducts }, () => {
            updateUI();
          });
        } else {
           setStatus('No response from content script.', 'error', '❌');
        }
      });
    });
  });

  downloadButton.addEventListener('click', () => {
    if (scrapedProducts.length === 0) {
      setStatus('No data to download.', 'error', '❌');
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
        setStatus(`Download error: ${chrome.runtime.lastError.message}`, 'error', '❌');
        console.error('Download error:', chrome.runtime.lastError);
      } else {
        setStatus('Download initiated.', 'success', '✓');
      }
      // Revoke the object URL to free up resources
      URL.revokeObjectURL(url);
    });
  });
  
  clearAllButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all scraped products?')) {
      scrapedProducts = [];
      chrome.storage.local.set({ scrapedProducts }, () => {
        setStatus('All products cleared.', 'info', 'ℹ️');
        updateUI();
      });
    }
  });

  // Handle individual product deletion
  productListDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const asin = e.target.dataset.asin;
      if (asin) {
        scrapedProducts = scrapedProducts.filter(product => product.asin !== asin);
        chrome.storage.local.set({ scrapedProducts }, () => {
          setStatus('Product removed.', 'info', 'ℹ️');
          updateUI();
        });
      }
    }
  });

  function updateUI() {
    // Update product count
    productCountSpan.textContent = scrapedProducts.length;
    
    // Update button states
    downloadButton.disabled = scrapedProducts.length === 0;
    clearAllButton.disabled = scrapedProducts.length === 0;

    // Update product list
    if (scrapedProducts.length > 0) {
      productListDiv.innerHTML = ''; // Clear previous list
      
      scrapedProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';
        
        const icon = document.createElement('div');
        icon.className = 'product-icon';
        icon.textContent = '📚'; // Book icon by default
        
        const details = document.createElement('div');
        details.className = 'product-details';
        
        const title = document.createElement('div');
        title.className = 'product-title';
        title.textContent = product.title || 'No Title';
        title.title = product.title || 'No Title'; // tooltip on hover
        
        const asin = document.createElement('div');
        asin.className = 'product-asin';
        asin.textContent = `ASIN: ${product.asin || 'N/A'}`;
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;'; // × symbol
        deleteBtn.title = 'Remove this product';
        deleteBtn.dataset.asin = product.asin;
        
        details.appendChild(title);
        details.appendChild(asin);
        
        item.appendChild(icon);
        item.appendChild(details);
        item.appendChild(deleteBtn);
        
        productListDiv.appendChild(item);
      });
    } else {
      // Show empty state
      productListDiv.innerHTML = `
        <div class="empty-state">
          No products scraped yet.<br>
          Visit an Amazon product page and click "Scrape Page".
        </div>
      `;
    }
  }

  function setStatus(message, type, iconText) {
    statusText.textContent = message;
    statusIcon.textContent = iconText || '';
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'flex';
    
    // Hide status after a few seconds unless it's an error
    if (type !== 'error') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
}); 