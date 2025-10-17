document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle Logic ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- Featured Collections Logic ---
    const featuredCollectionsContainer = document.getElementById('featured-collections');

    const fetchFeaturedProducts = async () => {
        try {
            const response = await fetch('./products.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const products = await response.json();
            displayFeatured(products);
        } catch (error) {
            featuredCollectionsContainer.innerHTML = '<p class="text-red-500 text-center">Could not load collections.</p>';
            console.error('Fetch error:', error);
        }
    };

    const displayFeatured = (products) => {
        featuredCollectionsContainer.innerHTML = '';
        const groupedProducts = products.reduce((acc, product) => {
            (acc[product.category] = acc[product.category] || []).push(product);
            return acc;
        }, {});

        for (const category in groupedProducts) {
            const categorySection = document.createElement('section');
            categorySection.innerHTML = `<h2 class="text-3xl font-semibold mb-6 text-black">${category}</h2>`;

            const productGrid = document.createElement('div');
            productGrid.className = 'product-grid';

            groupedProducts[category].slice(0, 4).forEach(product => { // Show up to 4 per category
                const productItem = document.createElement('a');
                productItem.href = `products.html?category=${encodeURIComponent(category)}`;
                productItem.className = 'product-item';
                productItem.innerHTML = `
                    <img src="${product.mainImg}" alt="${product.name}" class="w-full h-80 object-cover rounded-lg mb-4">
                    <h3 class="text-xl font-medium">${product.name}</h3>
                    <p class="text-lg font-bold text-gray-800 my-2">${product.price}</p>
                `;
                productGrid.appendChild(productItem);
            });
            categorySection.appendChild(productGrid);
            featuredCollectionsContainer.appendChild(categorySection);
        }
    };

    fetchFeaturedProducts();
});
