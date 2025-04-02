/**
 * Background script for Amazon Data Extractor
 * Handles storage of product data and file downloads
 */

// Initialize or get the products array from storage
async function getStoredProducts() {
  const data = await chrome.storage.local.get('products');
  return data.products || [];
}

// Save products to storage
async function saveProducts(products) {
  await chrome.storage.local.set({ products });
}

// Add a new product to storage
async function addProduct(product) {
  const products = await getStoredProducts();
  
  // Check if product with same ASIN already exists, replace it if so
  const index = products.findIndex(p => p.asin === product.asin);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
  
  await saveProducts(products);
  return products;
}

// Clear all stored products
async function clearProducts() {
  await saveProducts([]);
}

// Convert products to various formats
function convertProductsToCSV(products) {
  if (!products.length) return '';
  
  // Define CSV headers
  const headers = ['Title', 'Description', 'Price', 'Image URL', 'ASIN', 'Product URL', 'Prime', 'Extracted At'];
  
  // Format data rows
  const rows = products.map(product => [
    // Escape values that might contain commas or quotes
    `"${(product.title || '').replace(/"/g, '""')}"`,
    // For description, replace newlines with a placeholder for CSV
    `"${(product.description || '').replace(/\n/g, '\\n').replace(/"/g, '""')}"`,
    // Price is already a float with no currency symbols
    product.price || '',
    `"${product.imageUrl || ''}"`,
    `"${product.asin || ''}"`,
    `"${product.productUrl || ''}"`,
    `"${product.isPrime ? 'Yes' : 'No'}"`,
    `"${product.extractedAt || ''}"`,
  ]);
  
  // Combine headers and rows
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function convertProductsToJSON(products) {
  // We don't need to modify the data for JSON export
  // JSON.stringify will handle newlines and other formatting correctly
  return JSON.stringify(products, null, 2);
}

// Download data as a file
async function downloadDataAsFile(data, filename, type) {
  // Convert data to DataURL instead of Blob URL (which doesn't work in service workers)
  const dataUrl = await dataToDataUrl(data, type);
  
  // Download the file
  chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: true
  });
}

// Convert data to a data URL (works in service workers, unlike URL.createObjectURL)
function dataToDataUrl(data, mimeType) {
  return new Promise((resolve) => {
    // For text data, we can directly create a data URL
    const base64Data = btoa(unescape(encodeURIComponent(data)));
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    resolve(dataUrl);
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle adding a product
  if (message.action === 'addProduct') {
    addProduct(message.product)
      .then(products => {
        sendResponse({ success: true, count: products.length });
      })
      .catch(error => {
        console.error('Error adding product:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
  
  // Handle getting all products
  if (message.action === 'getProducts') {
    getStoredProducts()
      .then(products => {
        sendResponse({ products });
      })
      .catch(error => {
        console.error('Error getting products:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
  
  // Handle downloading data
  if (message.action === 'downloadData') {
    getStoredProducts()
      .then(products => {
        if (!products.length) {
          sendResponse({ success: false, error: 'No products to download' });
          return;
        }
        
        let data, filename, type;
        
        if (message.format === 'csv') {
          data = convertProductsToCSV(products);
          filename = 'amazon-products.csv';
          type = 'text/csv';
        } else {
          data = convertProductsToJSON(products);
          filename = 'amazon-products.json';
          type = 'application/json';
        }
        
        downloadDataAsFile(data, filename, type)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error in download:', error);
            sendResponse({ success: false, error: error.message });
          });
      })
      .catch(error => {
        console.error('Error downloading data:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Handle clearing products
  if (message.action === 'clearProducts') {
    clearProducts()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error clearing products:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
}); 