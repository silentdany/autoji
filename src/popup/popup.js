/**
 * Amazon Data Extractor Popup Script
 */

// DOM Elements
const extractButton = document.getElementById('extractButton');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const downloadJsonButton = document.getElementById('downloadJsonButton');
const clearDataButton = document.getElementById('clearDataButton');
const statusText = document.getElementById('statusText');
const productCount = document.getElementById('productCount');
const productList = document.getElementById('productList');
const notAmazonMessage = document.getElementById('notAmazonMessage');

// State
let isAmazonProductPage = false;
let storedProducts = [];

// Initialize the popup
async function initPopup() {
  updateProductCount();
  await checkIfAmazonProductPage();
  await loadStoredProducts();
  setupEventListeners();
}

// Check if the current tab is on an Amazon product page
async function checkIfAmazonProductPage() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab.url.includes('amazon.com')) {
      isAmazonProductPage = false;
      notAmazonMessage.classList.remove('hidden');
      extractButton.disabled = true;
    } else {
      isAmazonProductPage = true;
      notAmazonMessage.classList.add('hidden');
      extractButton.disabled = false;
    }
  } catch (error) {
    console.error('Error checking if Amazon page:', error);
    isAmazonProductPage = false;
    notAmazonMessage.classList.remove('hidden');
    extractButton.disabled = true;
  }
}

// Setup event listeners for buttons
function setupEventListeners() {
  extractButton.addEventListener('click', extractProductData);
  downloadCsvButton.addEventListener('click', () => downloadData('csv'));
  downloadJsonButton.addEventListener('click', () => downloadData('json'));
  clearDataButton.addEventListener('click', clearAllData);
}

// Load stored products from storage
async function loadStoredProducts() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getProducts' });
    if (response.products) {
      storedProducts = response.products;
      updateProductCount();
      renderProductList();
    }
  } catch (error) {
    console.error('Error loading stored products:', error);
    setStatus('Error loading products', 'error');
  }
}

// Extract product data from the current tab
async function extractProductData() {
  try {
    setStatus('Extracting...', 'pending');
    
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      setStatus('Error: Could not access current tab', 'error');
      return;
    }
    
    const activeTab = tabs[0];
    
    // Check if we're on an Amazon page
    if (!activeTab.url.includes('amazon.com')) {
      setStatus('Not an Amazon page', 'error');
      return;
    }
    
    // Send message to content script to extract data
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'extractData' });
      
      if (!response) {
        console.error('No response from content script');
        setStatus('Error communicating with page. Try refreshing the page.', 'error');
        return;
      }
      
      if (response.error) {
        setStatus(response.error, 'error');
        return;
      }
      
      // Save the extracted product
      const saveResponse = await chrome.runtime.sendMessage({ 
        action: 'addProduct', 
        product: response 
      });
      
      if (saveResponse.success) {
        setStatus('Product extracted successfully!', 'success');
        updateProductCount(saveResponse.count);
        await loadStoredProducts();
      } else {
        setStatus('Error saving product', 'error');
      }
    } catch (msgError) {
      console.error('Error sending message to content script:', msgError);
      setStatus('Content script not ready. Try refreshing the page.', 'error');
    }
  } catch (error) {
    console.error('Error extracting product:', error);
    setStatus('Error extracting product. Make sure you are on an Amazon product page.', 'error');
  }
}

// Download data as file
async function downloadData(format) {
  try {
    setStatus('Downloading...', 'pending');
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'downloadData', 
      format 
    });
    
    if (response.success) {
      setStatus(`${format.toUpperCase()} file downloaded`, 'success');
    } else {
      setStatus(response.error || 'Error downloading data', 'error');
    }
  } catch (error) {
    console.error('Error downloading data:', error);
    setStatus('Error downloading data', 'error');
  }
}

// Clear all stored data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all stored product data?')) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearProducts' });
    
    if (response.success) {
      setStatus('All data cleared', 'success');
      storedProducts = [];
      updateProductCount();
      renderProductList();
    } else {
      setStatus('Error clearing data', 'error');
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    setStatus('Error clearing data', 'error');
  }
}

// Update the product count display
function updateProductCount(count) {
  productCount.textContent = count || storedProducts.length || 0;
  
  // Disable download buttons if no products
  const hasProducts = (count || storedProducts.length) > 0;
  downloadCsvButton.disabled = !hasProducts;
  downloadJsonButton.disabled = !hasProducts;
}

// Set status message
function setStatus(message, type = '') {
  statusText.textContent = message;
  
  // Reset classes
  statusText.className = '';
  
  // Add appropriate class based on type
  if (type === 'error') {
    statusText.classList.add('text-danger');
  } else if (type === 'success') {
    statusText.classList.add('text-success');
  } else if (type === 'pending') {
    statusText.classList.add('text-pending');
  }
}

// Format a price for display
function formatPrice(price) {
  if (!price) return 'N/A';
  
  // Format as currency
  return '$' + parseFloat(price).toFixed(2);
}

// Render the product list
function renderProductList() {
  productList.innerHTML = '';
  
  if (!storedProducts.length) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'No products extracted yet';
    productList.appendChild(emptyMessage);
    return;
  }
  
  // Create product items
  storedProducts.forEach(product => {
    // Skip products with errors
    if (product.error) return;
    
    const productItem = document.createElement('div');
    productItem.className = 'product-item';
    
    const title = document.createElement('div');
    title.className = 'product-title';
    title.textContent = product.title;
    
    const details = document.createElement('div');
    details.className = 'product-details';
    
    const asin = document.createElement('span');
    asin.className = 'product-asin';
    asin.textContent = product.asin;
    
    const price = document.createElement('span');
    price.textContent = formatPrice(product.price);
    
    const prime = document.createElement('span');
    prime.className = 'product-prime';
    prime.textContent = product.isPrime ? 'Prime' : '';
    
    // Assemble the product item
    details.appendChild(asin);
    details.appendChild(price);
    details.appendChild(prime);
    
    productItem.appendChild(title);
    productItem.appendChild(details);
    
    // Add the product item to the list
    productList.appendChild(productItem);
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', initPopup); 