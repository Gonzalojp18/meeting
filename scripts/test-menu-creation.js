// Script para probar la creación de categorías y productos
const testMenuCreation = async () => {
  try {
    // Test category creation
    const categoryResponse = await fetch('http://localhost:3000/api/menu/category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
      },
      body: JSON.stringify({
        name: 'Categoría de Prueba',
        subtitle: 'Subtítulo de prueba',
        style: 'default',
        locations: ['location1'],
        printRole: 'kitchen'
      })
    });

    const categoryData = await categoryResponse.json();
    console.log('Categoría creada:', categoryData);

    if (categoryData.data?._id) {
      // Test item creation
      const itemResponse = await fetch(`http://localhost:3000/api/menu/category/${categoryData.data._id}/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
        },
        body: JSON.stringify({
          name: 'Producto de Prueba',
          description: 'Descripción del producto de prueba',
          prices: {
            location1: 15000,
            location2: 16000,
            location3: 17000
          },
          isAvailable: true,
          image: 'https://example.com/image.jpg'
        })
      });

      const itemData = await itemResponse.json();
      console.log('Producto creado:', itemData);
    }

    // Test final API response
    const menuResponse = await fetch('http://localhost:3000/api/menu/location1');
    const menuData = await menuResponse.json();
    
    // Check if our test category and items appear
    const testCategory = menuData.categories.find(c => c.name === 'Categoría de Prueba');
    if (testCategory) {
      console.log('✅ Categoría encontrada en el frontend:', testCategory.name);
      console.log('📦 Productos en esta categoría:', testCategory.items.length);
    } else {
      console.log('❌ Categoría no encontrada en el frontend');
    }

  } catch (error) {
    console.error('Error en prueba:', error);
  }
};

// Uncomment to run: testMenuCreation();
console.log('Script de prueba listo. Descomenta la llamada para ejecutar.');