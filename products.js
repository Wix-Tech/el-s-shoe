document.addEventListener('DOMContentLoaded', () => {
    const productCollectionsContainer = document.getElementById('product-collections');
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');

    const fetchProducts = async () => {
        try {
            const response = await fetch('./products.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const products = await response.json();
            displayProducts(products);
        } catch (error) {
            productCollectionsContainer.innerHTML = '<p class="text-red-500 text-center">Could not load products.</p>';
            console.error('Fetch error:', error);
        }
    };

    const displayProducts = (products) => {
        productCollectionsContainer.innerHTML = '';

        const productsToDisplay = categoryFilter
            ? products.filter(p => p.category === categoryFilter)
            : products;

        const groupedProducts = productsToDisplay.reduce((acc, product) => {
            (acc[product.category] = acc[product.category] || []).push(product);
            return acc;
        }, {});

        if (Object.keys(groupedProducts).length === 0) {
            productCollectionsContainer.innerHTML = '<p class="text-gray-600 text-center">No products found in this category.</p>';
            return;
        }

        for (const category in groupedProducts) {
            const categorySection = document.createElement('section');
            categorySection.innerHTML = `<h2 class="text-3xl font-semibold mb-6 text-black">${category}</h2>`;

            const productGrid = document.createElement('div');
            productGrid.className = 'product-grid';

            groupedProducts[category].forEach(product => {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                productItem.innerHTML = `
                    <img src="${product.mainImg}" alt="${product.name}" class="w-full h-80 object-cover rounded-lg mb-4">
                    <h3 class="text-xl font-medium">${product.name}</h3>
                    <p class="text-lg font-bold text-gray-800 my-2">${product.price}</p>
                    <a href="preview.html?id=${product.id}" class="view-button">View</a>
                `;
                productGrid.appendChild(productItem);
            });
            categorySection.appendChild(productGrid);
            productCollectionsContainer.appendChild(categorySection);
        }
    };

    fetchProducts();
});