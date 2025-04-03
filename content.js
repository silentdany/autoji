// Amazon product data scraper
const scrapeAmazonProduct = () => {
  try {
    const isBookPage = window.location.href.includes('/dp/') || 
                       window.location.href.includes('/gp/product/');
    
    // Basic product data extraction
    const productData = {
      title: document.querySelector('#productTitle')?.textContent.trim() || '',
      asin: getASIN(),
      price: (() => {
        const priceText = document.querySelector('span.slot-price')?.textContent.trim();
        if (!priceText) return null; // Or 0, depending on desired default
        // Remove currency symbols, commas, etc., keep only digits and decimal point
        const cleanedPrice = priceText.replace(/[^0-9.]/g, ''); 
        const priceValue = parseFloat(cleanedPrice);
        return isNaN(priceValue) ? null : priceValue; // Return null if parsing failed
      })(),
      description: document.querySelector('#productDescription p')?.textContent.trim() || 
                   document.querySelector('#bookDescription_feature_div .a-expander-content')?.textContent.trim() || '',
      imageUrl: document.querySelector('#imgBlkFront')?.src || 
                document.querySelector('#landingImage')?.src || '',
      url: `https://${window.location.hostname}/dp/${getASIN()}/`,
      isPrime: !!document.querySelector('.a-icon-prime'),
      timestamp: new Date().toISOString(),
    };
    
    // Book-specific data
    if (isBookPage) {
      const detailBullets = document.querySelectorAll('#detailBullets_feature_div li');
      const productDetails = document.querySelectorAll('#productDetailsTable .content li');
      const detailsSection = detailBullets.length > 0 ? detailBullets : productDetails;
      
      // Extract book details
      productData.bookDetails = {};
      detailsSection.forEach(bullet => {
        const text = bullet.textContent.trim();
        
        if (text.includes('Publisher') || text.includes('Publication date')) {
          const publisherMatch = text.match(/Publisher\s*:?\s*(.*?)(?:\(|;|$)/i);
          if (publisherMatch) productData.bookDetails.publisher = publisherMatch[1].trim();
          
          const dateMatch = text.match(/Publication date\s*:?\s*([^;)]+)/i) || 
                           text.match(/\(([^)]+)\)/);
          if (dateMatch) productData.bookDetails.publicationDate = dateMatch[1].trim();
        }
        
        if (text.includes('Language')) {
          const match = text.match(/Language\s*:?\s*([^;)]+)/i);
          if (match && match[1]) {
             // Get the captured group
             let language = match[1];
             
             // Even more aggressive cleaning: remove specific Unicode chars (like RLM U+200F and LRM U+200E) first
             language = language.replace(/\u200F/g, ''); // Remove RLM
             language = language.replace(/\u200E/g, ''); // Remove LRM
             
             // Then remove colons, replace multiple whitespaces/newlines with single space
             language = language.replace(/:/g, '').replace(/\s+/g, ' ').trim();
             
             // Further attempt to clean by removing anything after an opening parenthesis
             const parenthesisIndex = language.indexOf('(');
             if (parenthesisIndex !== -1) {
                 language = language.substring(0, parenthesisIndex).trim();
             }
             productData.bookDetails.language = language;
          }
        }
        
        if (text.includes('Print length') || text.includes('pages')) {
          const match = text.match(/(\d+)\s*pages/i);
          if (match) productData.bookDetails.pageCount = match[1];
        }
      });
      
      // NEW: Directly target ISBN elements using their IDs
      // Amazon often wraps the value, try targeting a common pattern first
      const isbn10Element = document.querySelector('#rpi-attribute-book_details-isbn10 .rpi-attribute-value span');
      productData.bookDetails.isbn10 = isbn10Element ? isbn10Element.textContent.trim() : 'N/A';

      const isbn13Element = document.querySelector('#rpi-attribute-book_details-isbn13 .rpi-attribute-value span');
      productData.bookDetails.isbn13 = isbn13Element ? isbn13Element.textContent.trim() : 'N/A';
      
      // Author extraction (could be multiple authors)
      const authorElements = document.querySelectorAll('.author .a-link-normal, .author .contributorNameID');
      if (authorElements.length > 0) {
        productData.bookDetails.authors = Array.from(authorElements).map(el => el.textContent.trim());
      } else {
        const authorElement = document.querySelector('.author a, .contributorNameID');
        if (authorElement) {
          productData.bookDetails.authors = [authorElement.textContent.trim()];
        }
      }
    }
    
    return productData;
  } catch (error) {
    console.error('Error scraping product data:', error);
    return { error: error.message };
  }
}

// Helper function to extract ASIN from URL or page
function getASIN() {
  // Try to get from URL first
  const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/) || 
                   window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
  
  if (urlMatch) return urlMatch[1];
  
  // Try to find in the page
  const asinElement = document.querySelector('input[name="ASIN"], input[name="asin"]');
  if (asinElement) return asinElement.value;
  
  return '';
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeProduct') {
    const productData = scrapeAmazonProduct();
    sendResponse(productData);
  }
  return true; // Keep the message channel open for asynchronous response
});

console.log('Amazon scraper content script loaded'); 