// Amazon product data scraper
const scrapeAmazonProduct = () => {
  try {
    const isBookPage = window.location.href.includes('/dp/') || 
                       window.location.href.includes('/gp/product/');
    
    // Basic product data extraction
    const productData = {
      title: document.querySelector('#productTitle')?.textContent.trim() || '',
      asin: getASIN(),
      description: document.querySelector('#productDescription p')?.textContent.trim() || 
                   document.querySelector('#bookDescription_feature_div .a-expander-content')?.textContent.trim() || '',
      imageUrl: document.querySelector('#imgBlkFront')?.src || 
                document.querySelector('#landingImage')?.src || '',
      url: `https://${window.location.hostname}/dp/${getASIN()}/`,
      isPrime: !!document.querySelector('.a-icon-prime'),
      timestamp: new Date().toISOString(),
      
      // Extract format options (ebook, audiobook)
      formats: {
        // Ebook (Kindle) information
        ebook: (() => {
          // Try to find Kindle format in the format selection area
          const kindleFormat = Array.from(document.querySelectorAll('#tmmSwatches .swatchElement'))
            .find(el => el.textContent.includes('Kindle') || el.textContent.includes('eBook'));
          
          if (kindleFormat) {
            const linkElement = kindleFormat.querySelector('a.a-button-text');
            
            // Extract ASIN from the link if possible
            let ebookAsin = '';
            if (linkElement && linkElement.href) {
              const asinMatch = linkElement.href.match(/\/dp\/([A-Z0-9]{10})/);
              if (asinMatch) ebookAsin = asinMatch[1];
            }
            
            return {
              available: true,
              url: ebookAsin ? `https://${window.location.hostname}/dp/${ebookAsin}/` : null,
              asin: ebookAsin || null
            };
          }
          
          // Alternative method: check for Kindle link elsewhere
          const kindleLink = document.querySelector('a[href*="/dp/"][href*="Kindle"], a[href*="/dp/"][href*="kindle"]');
          if (kindleLink) {
            let ebookAsin = null;
            let url = null;
            
            const asinMatch = kindleLink.href.match(/\/dp\/([A-Z0-9]{10})/);
            if (asinMatch) {
              ebookAsin = asinMatch[1];
              url = `https://${window.location.hostname}/dp/${ebookAsin}/`;
            }
            
            return {
              available: true,
              url: url,
              asin: ebookAsin
            };
          }
          
          // No ebook found
          return {
            available: false,
            url: null,
            asin: null
          };
        })(),
        
        // Audiobook information
        audiobook: (() => {
          // Try to find Audiobook format in the format selection area
          const audiobookFormat = Array.from(document.querySelectorAll('#tmmSwatches .swatchElement'))
            .find(el => el.textContent.includes('Audiobook') || el.textContent.includes('Audio CD') || el.textContent.includes('Audible'));
          
          if (audiobookFormat) {
            const linkElement = audiobookFormat.querySelector('a.a-button-text');
            
            // Extract ASIN from the link if possible
            let audiobookAsin = '';
            if (linkElement && linkElement.href) {
              const asinMatch = linkElement.href.match(/\/dp\/([A-Z0-9]{10})/);
              if (asinMatch) audiobookAsin = asinMatch[1];
            }
            
            return {
              available: true,
              url: audiobookAsin ? `https://${window.location.hostname}/dp/${audiobookAsin}/` : null,
              asin: audiobookAsin || null
            };
          }
          
          // Alternative method: check for Audible section
          const audibleSection = document.querySelector('#audibleSample, .audible-section');
          if (audibleSection) {
            // Try to find the Audible link separately
            const audibleLink = document.querySelector('a[href*="/dp/"][href*="Audible"], a[href*="/dp/"][href*="audiobook"]');
            let audiobookAsin = null;
            let url = null;
            
            if (audibleLink) {
              const asinMatch = audibleLink.href.match(/\/dp\/([A-Z0-9]{10})/);
              if (asinMatch) {
                audiobookAsin = asinMatch[1];
                url = `https://${window.location.hostname}/dp/${audiobookAsin}/`;
              }
            }
            
            return {
              available: true,
              url: url,
              asin: audiobookAsin
            };
          }
          
          // No audiobook found
          return {
            available: false,
            url: null,
            asin: null
          };
        })()
      },
      
      // Extract reviews data
      reviews: {
        // Amazon review summary only
        amazon: {
          rating: (() => {
            const ratingText = document.querySelector('#acrPopover .a-icon-alt')?.textContent || '';
            const ratingMatch = ratingText.match(/([0-9.]+)/);
            return ratingMatch ? parseFloat(ratingMatch[1]) : null;
          })(),
          totalReviews: (() => {
            const reviewCountText = document.querySelector('#acrCustomerReviewText')?.textContent || '';
            const reviewCountMatch = reviewCountText.match(/([0-9,]+)/);
            if (reviewCountMatch) {
              return parseInt(reviewCountMatch[1].replace(/,/g, ''));
            }
            return null;
          })()
          // No detailed reviews as requested
        },
        
        // Goodreads ratings only (as floats)
        goodreads: (() => {
          // Check if Goodreads elements exist
          const grRatingElements = document.querySelectorAll('.gr-review-rating-text');
          const grCountElement = document.querySelector('.gr-review-count-text span');
          
          // Return null if no Goodreads data found
          if (grRatingElements.length === 0 && !grCountElement) return null;
          
          // Extract rating
          let rating = null;
          if (grRatingElements.length > 0) {
            const ratingValues = Array.from(grRatingElements)
              .map(element => {
                const ratingSpan = element.querySelector('span');
                if (!ratingSpan) return null;
                
                const ratingText = ratingSpan.textContent.trim();
                const ratingMatch = ratingText.match(/([0-9.]+)/);
                return ratingMatch ? parseFloat(ratingMatch[1]) : null;
              })
              .filter(r => r !== null);
              
            // Calculate average if we have any valid ratings
            if (ratingValues.length > 0) {
              rating = parseFloat(
                (ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length).toFixed(1)
              );
            }
          }
          
          // Extract total reviews count
          let totalReviews = null;
          if (grCountElement) {
            const countText = grCountElement.textContent.trim();
            const countMatch = countText.match(/([0-9,]+)/);
            if (countMatch) {
              totalReviews = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return {
            rating,
            totalReviews
          };
        })()
      }
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

// Add floating action button to the page
function injectFAB() {
  // Check if we're on an Amazon product page
  if (!(window.location.href.includes('/dp/') || window.location.href.includes('/gp/product/'))) {
    return; // Don't inject on non-product pages
  }

  // Create the button
  const fab = document.createElement('button');
  fab.className = 'autoji-fab';
  fab.textContent = '🔥';
  fab.title = 'Scrape this product';
  
  // Create a toast notification element
  const toast = document.createElement('div');
  toast.className = 'autoji-toast';
  toast.style.display = 'none';
  
  // Add them to the body
  document.body.appendChild(fab);
  document.body.appendChild(toast);
  
  // Handle click event
  fab.addEventListener('click', async () => {
    fab.classList.add('pulse');
    showToast('Scraping product...', 'info');
    
    try {
      // Scrape the product data
      const productData = scrapeAmazonProduct();
      
      if (productData.error) {
        showToast(`Error: ${productData.error}`, 'error');
      } else {
        // Save to storage through background script or API
        chrome.storage.local.get(['scrapedProducts'], (result) => {
          let scrapedProducts = result.scrapedProducts || [];
          
          // Check if product already exists
          const existingIndex = scrapedProducts.findIndex(p => p.asin === productData.asin);
          if (existingIndex !== -1) {
            scrapedProducts[existingIndex] = productData;
            showToast('Product updated in your list', 'success');
          } else {
            scrapedProducts.push(productData);
            showToast('Product added to your list', 'success');
          }
          
          // Save updated list back to storage
          chrome.storage.local.set({ scrapedProducts });
        });
      }
    } catch (error) {
      showToast(`Scraping failed: ${error.message}`, 'error');
    }
    
    // Remove pulse animation after it completes
    setTimeout(() => {
      fab.classList.remove('pulse');
    }, 500);
  });
  
  // Show a toast notification
  function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `autoji-toast ${type}`;
    toast.style.display = 'block';
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Hide toast after a few seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 3000);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeProduct') {
    const productData = scrapeAmazonProduct();
    sendResponse(productData);
  }
  return true; // Keep the message channel open for asynchronous response
});

// Run when the content script is injected
injectFAB();
console.log('Amazon scraper content script loaded'); 