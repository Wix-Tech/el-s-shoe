document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle Logic ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // --- Sticky Header Logic ---
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                mainHeader.classList.add('bg-white', 'shadow-xl');
                mainHeader.classList.remove('bg-transparent');
            } else {
                mainHeader.classList.remove('bg-white', 'shadow-xl');
                mainHeader.classList.add('bg-transparent');
            }
        });
    }

    // --- Intersection Observer for Scroll Animations ---
    const animateOnScrollElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.animate-fadeInUp, .animate-fadeIn').forEach(el => {
                    el.style.opacity = '0';
                    el.style.animationPlayState = 'running';
                });
                entry.target.classList.add('animate-fadeIn');
                entry.target.classList.remove('animate-on-scroll');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    animateOnScrollElements.forEach(el => {
        el.querySelectorAll('.animate-fadeInUp, .animate-fadeIn').forEach(child => {
            child.style.opacity = '0';
            child.style.animationPlayState = 'paused';
        });
        observer.observe(el);
    });

    // Initial animation for Hero section elements (as it's always visible)
    const heroContent = document.getElementById('hero-content');
    if (heroContent) {
        heroContent.querySelectorAll('.animate-fadeInUp, .animate-fadeIn').forEach(el => {
            el.style.opacity = '0';
            el.style.animationPlayState = 'paused';
        });

        heroContent.querySelector('h1.animate-fadeInUp').style.animationPlayState = 'running';
        heroContent.querySelector('p.animate-fadeInUp.animate-delay-200').style.animationPlayState = 'running';
        heroContent.querySelector('a.animate-fadeInUp.animate-delay-400').style.animationPlayState = 'running';
    }


    // --- Shopping Cart Logic ---
    const cartIconButton = document.getElementById('cart-icon-button');
    const cartCountSpan = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const closeCartModalButton = document.getElementById('close-cart-modal');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartTotalSpan = document.getElementById('cart-total');
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    const proceedToCheckoutButton = cartModal ? cartModal.querySelector('button.w-full') : null;

    let cart = JSON.parse(localStorage.getItem('elsWearsCart')) || [];

    // Function to save cart to localStorage
    function saveCart() {
        localStorage.setItem('elsWearsCart', JSON.stringify(cart));
    }

    // Function to update cart count in header
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
        cartCountSpan.classList.toggle('hidden', totalItems === 0);
    }

    // Function to render cart items in the modal
    function renderCartItems() {
        if (!cartItemsContainer || !emptyCartMessage || !cartTotalSpan) {
            console.error("Cart modal elements not found. Cannot render cart items.");
            return;
        }

        cartItemsContainer.innerHTML = ''; // Clear existing items
        if (cart.length === 0) {
            emptyCartMessage.classList.remove('hidden');
        } else {
            emptyCartMessage.classList.add('hidden');
            cart.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('flex', 'items-center', 'justify-between', 'py-2', 'border-b', 'border-gray-100');
                itemElement.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <img src="${item.image || 'https://placehold.co/60x60/e2e8f0/64748b?text=Shoe'}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md">
                        <div>
                            <p class="font-semibold text-gray-900">${item.name}</p>
                            <p class="text-sm text-gray-600">$${item.price.toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button class="decrease-quantity-btn bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300 transition" data-product-id="${item.id}">-</button>
                        <span class="font-medium text-gray-800">${item.quantity}</span>
                        <button class="increase-quantity-btn bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300 transition" data-product-id="${item.id}">+</button>
                        <button class="remove-from-cart-btn text-red-500 hover:text-red-700 transition" data-product-id="${item.id}">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
            });
        }
        updateCartTotal();
    }

    // Function to update cart total
    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalSpan.textContent = `$${total.toFixed(2)}`;
    }

    // Add to cart functionality
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.productId;
            const productName = event.target.dataset.productName;
            const productPrice = parseFloat(event.target.dataset.productPrice);
            const productImageElement = event.target.closest('.bg-gray-50')?.querySelector('img');
            const productImage = productImageElement ? productImageElement.src : 'https://placehold.co/60x60/e2e8f0/64748b?text=Shoe'; // Fallback image

            const existingItem = cart.find(item => item.id === productId);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: 1
                });
            }
            saveCart();
            updateCartCount();
            renderCartItems(); // Re-render cart when an item is added
            if (cartModal) {
                cartModal.classList.add('open'); // Open cart modal when item is added
            }
        });
    });

    // Event delegation for quantity change and removal
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.dataset.productId;

            if (target.classList.contains('increase-quantity-btn')) {
                const item = cart.find(item => item.id === productId);
                if (item) {
                    item.quantity++;
                    saveCart();
                    updateCartCount();
                    renderCartItems();
                }
            } else if (target.classList.contains('decrease-quantity-btn')) {
                const item = cart.find(item => item.id === productId);
                if (item && item.quantity > 1) {
                    item.quantity--;
                    saveCart();
                    updateCartCount();
                    renderCartItems();
                } else if (item && item.quantity === 1) {
                    // If quantity is 1 and decreased, remove the item
                    cart = cart.filter(item => item.id !== productId);
                    saveCart();
                    updateCartCount();
                    renderCartItems();
                }
            } else if (target.closest('.remove-from-cart-btn')) {
                cart = cart.filter(item => item.id !== productId);
                saveCart();
                updateCartCount();
                renderCartItems();
            }
        });
    }


    // Open/Close Cart Modal
    if (cartIconButton && cartModal && closeCartModalButton) {
        cartIconButton.addEventListener('click', () => {
            renderCartItems(); // Render items every time modal is opened to ensure it's up-to-date
            cartModal.classList.add('open');
        });

        closeCartModalButton.addEventListener('click', () => {
            cartModal.classList.remove('open');
        });

        // Close modal when clicking outside content
        cartModal.addEventListener('click', (event) => {
            if (event.target === cartModal) {
                cartModal.classList.remove('open');
            }
        });
    }


    // "Proceed to Checkout" button functionality
    if (proceedToCheckoutButton) {
        proceedToCheckoutButton.addEventListener('click', () => {
            if (cart.length > 0) {
                console.log("Proceeding to checkout with cart:", cart);
                // In a real application, you would redirect to a checkout page
                // or initiate a payment process here.
                // For now, we'll just log to the console and clear the cart.
                // IMPORTANT: In a production environment, replace this alert with a custom modal or redirection.
                alert("Thank you for your purchase! (This is a placeholder checkout. In a real app, you'd be redirected.)");
                cart = []; // Clear the cart after "checkout"
                saveCart();
                updateCartCount();
                renderCartItems();
                if (cartModal) {
                    cartModal.classList.remove('open'); // Close the cart modal
                }
            } else {
                console.log("Cart is empty. Cannot proceed to checkout.");
                alert("Your cart is empty. Please add items before proceeding to checkout.");
            }
        });
    }

    // Initialize cart on page load
    updateCartCount();


    // --- ✨ Personalized Shoe Care Tips Logic (Gemini API Integration) ✨ ---
    const shoeTypeInput = document.getElementById('shoe-type-input');
    const generateCareTipsBtn = document.getElementById('generate-care-tips-btn');
    const careTipsOutput = document.getElementById('care-tips-output');
    const careTipsLoading = document.getElementById('care-tips-loading');

    if (generateCareTipsBtn && shoeTypeInput && careTipsOutput && careTipsLoading) {
        generateCareTipsBtn.addEventListener('click', async () => {
            const shoeType = shoeTypeInput.value.trim();
            if (!shoeType) {
                careTipsOutput.innerHTML = '<p class="text-red-500">Please enter a shoe type.</p>';
                return;
            }

            careTipsOutput.innerHTML = ''; // Clear previous tips
            careTipsLoading.classList.remove('hidden'); // Show loading message

            try {
                let chatHistory = [];
                const prompt = `Generate shoe care tips for "${shoeType}" in a professional, concise tone. Format the tips as a bulleted list.`;
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                const payload = { contents: chatHistory };
                const apiKey = ""; // Canvas will automatically provide this in runtime
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

                let response;
                let result;
                let retries = 0;
                const maxRetries = 3;
                const baseDelay = 1000; // 1 second

                // Exponential backoff for API calls
                while (retries < maxRetries) {
                    try {
                        response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if (response.ok) {
                            result = await response.json();
                            break; // Exit loop on success
                        } else if (response.status === 429) { // Too Many Requests
                            const delay = baseDelay * Math.pow(2, retries) + Math.random() * 500; // Add jitter
                            console.warn(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
                            retries++;
                            await new Promise(resolve => setTimeout(resolve, delay));
                        } else {
                            throw new Error(`API error: ${response.status} ${response.statusText}`);
                        }
                    } catch (error) {
                        console.error("Fetch error:", error);
                        careTipsOutput.innerHTML = `<p class="text-red-500">Error generating tips: ${error.message}. Please try again.</p>`;
                        careTipsLoading.classList.add('hidden');
                        return; // Exit if a non-retryable error occurs
                    }
                }

                if (!result || !result.candidates || result.candidates.length === 0 ||
                    !result.candidates[0].content || !result.candidates[0].content.parts ||
                    result.candidates[0].content.parts.length === 0) {
                    careTipsOutput.innerHTML = '<p class="text-red-500">Could not generate tips. Please try a different input.</p>';
                    return;
                }

                const text = result.candidates[0].content.parts[0].text;
                careTipsOutput.innerHTML = `<div class="prose max-w-none">${text.replace(/\n/g, '<br>')}</div>`; // Display as HTML, replace newlines with <br>
            } catch (error) {
                console.error("Error during API call:", error);
                careTipsOutput.innerHTML = `<p class="text-red-500">An unexpected error occurred: ${error.message}.</p>`;
            } finally {
                careTipsLoading.classList.add('hidden'); // Hide loading message
            }
        });
    }

    // --- "Show More/Less" Products Logic ---
    const showMoreProductsBtn = document.getElementById('show-more-products-btn');
    const showLessProductsBtn = document.getElementById('show-less-products-btn');
    const extraProductCards = document.querySelectorAll('.extra-product-card');

    if (showMoreProductsBtn && showLessProductsBtn && extraProductCards.length > 0) {
        // Initial state: Show only the first 3 products (already visible in HTML)
        // Hide extra products and "Show Less" button
        extraProductCards.forEach(card => card.classList.add('hidden'));
        showLessProductsBtn.classList.add('hidden');
        showMoreProductsBtn.classList.remove('hidden'); // Ensure "Show More" is visible

        showMoreProductsBtn.addEventListener('click', () => {
            extraProductCards.forEach(card => {
                card.classList.remove('hidden'); // Make the hidden cards visible
            });
            showMoreProductsBtn.classList.add('hidden'); // Hide "Show More"
            showLessProductsBtn.classList.remove('hidden'); // Show "Show Less"
        });

        showLessProductsBtn.addEventListener('click', () => {
            extraProductCards.forEach(card => {
                card.classList.add('hidden'); // Hide the extra cards
            });
            showLessProductsBtn.classList.add('hidden'); // Hide "Show Less"
            showMoreProductsBtn.classList.remove('hidden'); // Show "Show More"
        });
    }
});
