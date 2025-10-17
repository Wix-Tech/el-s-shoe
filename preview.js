document.addEventListener('DOMContentLoaded', () => {
    const previewContainer = document.getElementById('preview-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'), 10);

    const fetchProduct = async () => {
        if (!productId) {
            previewContainer.innerHTML = '<p class="text-red-500 text-center col-span-2">No product ID specified.</p>';
            return;
        }

        try {
            const response = await fetch('./products.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const products = await response.json();
            const product = products.find(p => p.id === productId);

            if (product) {
                displayProduct(product);
            } else {
                previewContainer.innerHTML = '<p class="text-red-500 text-center col-span-2">Product not found.</p>';
            }
        } catch (error) {
            previewContainer.innerHTML = '<p class="text-red-500 text-center col-span-2">Could not load product details.</p>';
            console.error('Fetch error:', error);
        }
    };

    const displayProduct = (product) => {
        previewContainer.innerHTML = `
            <div class="image-gallery">
                <img src="${product.mainImg}" alt="${product.name}" id="main-product-image" class="w-full h-auto object-cover rounded-lg shadow-lg">
                <div class="sub-images">
                    ${product.subImg.map(img => `<img src="${img}" alt="Sub image of ${product.name}" class="sub-image-item">`).join('')}
                </div>
            </div>
            <div class="product-details">
                <h1 class="text-4xl font-bold mb-2">${product.name}</h1>
                <p class="text-3xl font-semibold text-gray-800 mb-4">${product.price}</p>
                <p class="text-gray-700 leading-relaxed mb-6">${product.description}</p>
                <button class="add-to-cart-button">Add to Cart</button>
            </div>
        `;

        const mainImage = document.getElementById('main-product-image');
        const subImages = document.querySelectorAll('.sub-image-item');

        subImages.forEach(subImg => {
            subImg.addEventListener('click', () => {
                mainImage.src = subImg.src;
            });
        });
    };

    fetchProduct();
});