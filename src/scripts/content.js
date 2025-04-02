/**
 * Amazon Data Extractor Content Script
 * Extracts product information from Amazon product pages
 */

// Notify that the content script is loaded
console.log('Amazon Data Extractor content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === "extractData") {
    try {
      const productData = extractProductData();
      console.log('Extracted product data:', productData);
      sendResponse(productData);
    } catch (error) {
      console.error('Error in extractProductData:', error);
      sendResponse({ error: "Failed to extract product data: " + error.message });
    }
  }
  return true; // Required to use sendResponse asynchronously
});

/**
 * Extracts product data from the current Amazon product page
 */
function extractProductData() {
  // Check if we're on a product page
  if (!isProductPage()) {
    console.warn('Not a recognized Amazon product page');
    return { error: "Not a product page. Please navigate to an Amazon product detail page." };
  }

  try {
    // Extract ASIN (Amazon Standard Identification Number)
    const asin = getASIN();
    if (!asin) {
      console.warn('Could not find ASIN');
      return { error: "Could not identify product ASIN" };
    }
    
    // Get product title
    const title = document.querySelector('#productTitle')?.textContent.trim() || '';
    if (!title) {
      console.warn('Could not find product title');
    }
    
    // Get product description
    const description = getProductDescription();
    
    // Get price as float only
    const price = getPriceAsFloat();
    if (!price) {
      console.warn('Could not find price');
    }
    
    // Get main product image
    const imageUrl = getMainImage();
    if (!imageUrl) {
      console.warn('Could not find main image');
    }
    
    // Check if product is Prime eligible
    const isPrime = checkIsPrime();
    
    // Get product URL (clean version)
    const productUrl = getCleanProductUrl(asin);

    return {
      title,
      description,
      price,
      imageUrl,
      asin,
      productUrl,
      isPrime,
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error extracting product data:", error);
    return { error: "Failed to extract product data: " + error.message };
  }
}

/**
 * Checks if the current page is an Amazon product page
 */
function isProductPage() {
  // Look for typical product page elements
  const isProductTitle = !!document.querySelector('#productTitle');
  const isProductContainer = !!document.querySelector('#dp-container') || 
                           !!document.querySelector('#dp') ||
                           !!document.querySelector('#ppd');
  const hasAsin = !!document.querySelector('[data-asin]') || getASIN() !== '';
  
  console.log('Page detection:', {
    isProductTitle, 
    isProductContainer,
    hasAsin,
    url: window.location.href
  });
  
  // Must have at least one of these indicators
  return isProductTitle || (isProductContainer && hasAsin);
}

/**
 * Returns a clean Amazon product URL with just the ASIN
 */
function getCleanProductUrl(asin) {
  const domain = window.location.hostname;
  return `https://${domain}/dp/${asin}`;
}

/**
 * Extracts the ASIN from the product page
 */
function getASIN() {
  // Try to get ASIN from various locations
  // 1. From URL
  const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  
  // 2. From product details
  const asinElement = document.querySelector('*[data-asin]');
  if (asinElement && asinElement.getAttribute('data-asin')) {
    return asinElement.getAttribute('data-asin');
  }
  
  // 3. From add to cart form
  const addToCartInput = document.querySelector('input[name="ASIN"]');
  if (addToCartInput && addToCartInput.value) {
    return addToCartInput.value;
  }
  
  // 4. From product details section
  const detailsSection = document.querySelectorAll('#detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_1 tr');
  for (const detail of detailsSection) {
    const text = detail.textContent.trim();
    if (text.includes('ASIN') || text.includes('ISBN-10')) {
      const asinMatch = text.match(/[A-Z0-9]{10}/);
      if (asinMatch) return asinMatch[0];
    }
  }
  
  // 5. Look for it in the page source as a last resort
  const pageSource = document.documentElement.innerHTML;
  const sourceMatch = pageSource.match(/"ASIN":"([A-Z0-9]{10})"/);
  if (sourceMatch && sourceMatch[1]) return sourceMatch[1];
  
  return '';
}

/**
 * Extracts the product description while preserving formatting
 */
function getProductDescription() {
  // Try different description selectors (Amazon's structure varies)
  const selectors = [
    '#productDescription',
    '#feature-bullets',
    '#aplus',
    '.a-expander-content',
    '#bookDescription_feature_div'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Preserve formatting
      return preserveTextFormatting(element);
    }
  }
  
  // If no description found in dedicated sections, try feature bullets
  const featureBullets = document.querySelectorAll('#feature-bullets li');
  if (featureBullets.length > 0) {
    // Convert bullets to formatted text with bullet points
    let bulletText = '';
    featureBullets.forEach(bullet => {
      bulletText += '• ' + bullet.textContent.trim() + '\n';
    });
    return bulletText;
  }
  
  return '';
}

/**
 * Preserves text formatting including bullets, line breaks, etc.
 */
function preserveTextFormatting(element) {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true);
  
  // Replace bullet points or bullet point-like elements
  const bulletElements = clone.querySelectorAll('li, .a-list-item');
  bulletElements.forEach(bullet => {
    // Don't modify if it already starts with a bullet
    if (!bullet.textContent.trim().startsWith('•')) {
      bullet.textContent = '• ' + bullet.textContent.trim();
    }
  });
  
  // Replace <br> with newlines
  const brs = clone.querySelectorAll('br');
  brs.forEach(br => {
    br.replaceWith('\n');
  });
  
  // Replace <p>, <div>, <h1-h6>, <li> endings with newlines if they don't already end with one
  const blocks = clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr');
  blocks.forEach(block => {
    if (block.nextSibling && block.nextSibling.textContent.trim() !== '') {
      block.textContent = block.textContent.trim() + '\n';
    }
  });
  
  // Get the text content and normalize
  let text = clone.textContent.trim();
  
  // Replace multiple consecutive newlines with two newlines (one blank line)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

/**
 * Extracts the product price as a float (without currency symbols)
 */
function getPriceAsFloat() {
  const priceText = getPrice();
  if (!priceText) return '';
  
  // Extract numeric value from the price text
  const numericMatch = priceText.match(/[\d\.,]+/);
  if (numericMatch) {
    // Convert to float (remove commas, keep decimal point)
    const numericString = numericMatch[0].replace(/,/g, '');
    return parseFloat(numericString);
  }
  
  return '';
}

/**
 * Extracts the product price as text
 */
function getPrice() {
  // Try different price selectors
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole',
    '#price_inside_buybox',
    '#corePrice_feature_div .a-offscreen',
    '#newBuyBoxPrice'
  ];
  
  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const price = element.textContent.trim();
      if (price && price.includes('$')) {
        return price;
      }
    }
  }
  
  return '';
}

/**
 * Extracts the main product image URL
 */
function getMainImage() {
  // Try different image selectors
  const mainImage = document.querySelector('#landingImage') || 
                    document.querySelector('#imgBlkFront') || 
                    document.querySelector('#ebooksImgBlkFront') ||
                    document.querySelector('#main-image');
  
  if (mainImage) {
    // Try different attributes where the image URL might be stored
    const possibleAttributes = ['src', 'data-old-hires', 'data-a-dynamic-image'];
    
    for (const attr of possibleAttributes) {
      const value = mainImage.getAttribute(attr);
      if (value) {
        // For data-a-dynamic-image, it's a JSON string containing image URLs
        if (attr === 'data-a-dynamic-image') {
          try {
            const imageJson = JSON.parse(value);
            // Get the URL with the highest resolution
            const urls = Object.keys(imageJson);
            if (urls.length > 0) {
              return urls[0];
            }
          } catch (e) {
            // If JSON parsing fails, continue to next attribute
            console.error('Error parsing image JSON:', e);
          }
        } else {
          return value;
        }
      }
    }
  }
  
  // Try to get image from the image gallery
  const imgContainer = document.querySelector('.imgTagWrapper img');
  if (imgContainer) {
    return imgContainer.getAttribute('src') || '';
  }
  
  // Try other image containers
  const altImageContainers = [
    '.image-stretch-vertical img',
    '#imageBlock img',
    '#main-image-container img'
  ];
  
  for (const selector of altImageContainers) {
    const img = document.querySelector(selector);
    if (img) {
      return img.getAttribute('src') || '';
    }
  }
  
  return '';
}

/**
 * Checks if the product is Prime eligible
 */
function checkIsPrime() {
  // Look for Prime elements
  return !!document.querySelector('.a-icon-prime') || 
         !!document.querySelector('#prime-meta-module') ||
         !!document.querySelector('*[aria-label="Amazon Prime"]') ||
         !!document.querySelector('.a-icon.a-icon-prime') ||
         !!document.querySelector('*[class*="prime-badge"]');
} 