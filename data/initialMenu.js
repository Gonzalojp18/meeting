
export const initialMenu = {
  categories: [
    {
      id: 1,
      name: "Desayunos & Meriendas",
      subtitle: "Disfruta de nuestros Bowl de Yogurt Natural.",
      items: [
        {
          id: 1,
          name: "Cafe mas Tostadas",
          description: "Cafe a eleccion mas tostadas con queso untable y mermelada",
          prices: {
            location1: 5900,
            location2: 5900
          }
        },
        {
          id: 2,
          name: "Exprimido mas Tostado",
          description: "Tostado de jamon y queso (Pan arabe) y exprimido de naranja",
          prices: {
            location1: 8100,
            location2: 8100
          }
        },
        {
          id: 3,
          name: "Cafe con leche acompañado con 3 Medialunas",
          prices: {
            location1: 5500,
            location2: 8100
          }
        },
        {
          id: 4,
          name: "Omellete acompañado de exprimido de Naranja",
          prices: {
            location1: 7800,
            location2: 7800
          }
        },
        {
          id: 5,
          name: "Huevos y Tostadas",
          description: "Huevos revueltos mas tostadas de pan de campo, acompañado de exprimido de naranja mas infusión",
          prices: {
            location1: 8200,
            location2: 8200
          }
        },
        {
          id: 6,
          name: "COPAS DE YOGURT:",
          description: "Cremoso yogurt natural, trozos de durazno y granola",
          prices: {
            location1: 4500,
            location2: 4500
          }
        },
        {
          id: 7,
          description: "Cremoso yogurt natural, avena y frutos rojos",
          prices: {
            location1: 4500,
            location2: 4500
          }
        },
      ],
      style: "default"
    },
    {
      id: 2,
      name: "Entradas & Picadas",
      image: {
        url: '../assets/entradas/tortilla.webp',
        position: "beside-title", // imagen arriba de la categoría
        alt: "pizza"
      },
      items: [
        {
          id: 8,
          name: "Bastones de Muzarella",
          description: "Acompañados con consome de Tomáte.",
          prices: {
            location1: 4900,
            location2: 5800,
          }
        },
        {
          id: 9,
          name: "Tortilla de Papa",
          description: "Opcion: Cocina o Babe",
          prices: {
            location1: 6800,
            location2: 7200,
          }
        },
        {
          id: 10,
          name: "Buñuelos de Acelga",
          description: "Acompañada de salsa alioli",
          prices: {
            location1: 6100,
            location2: 6500,
          }
        },
        {
          id: 11,
          name: "Papas Fritas",
          description: "Sola",
          prices: {
            location1: 5900,
            location2: 6500,
          }
        },
        {
          id:12,
          name: "Papas Fritas",
          description: "Sola",
          prices: {
            location1: 5500,
            location2: 6300,
          }
        },
        {
          id: 13,
          name: "Papas Fritas",
          description: "A Caballo",
          prices: {
            location1: 6300,
            location2: 7200,
          }
        }
      ],
      style: "default",
    },
    {
      id: 3,
      name: "Nuestros Platos",
      image: {
        url: '../assets/almuerzos/altrepizza.png',
        position: "bottom", // imagen arriba de la categoría
        alt: "pizza"
      },
      items: [
        {
          id: 14,
          name: "Pechuga grillada con guarnicion de ensalada mixta",
          description: "",
          prices: {
            location1: 9200,
            location2: 9700,
          }
        },
        {
          id: 15,
          name: "Milanesa o Suprema napolitana con papas españolas",
          description: "",
          prices: {
            location1: 8950,
            location2: 8950,
          }
        },
        {
          id: 16,
          name: "Pasta en cinta al huevo con salsa bolognesa",
          description: "",
          prices: {
            location1: 8100,
            location2: 7400
          }
        },
        {
          id: 17,
          name: "Escalope de pollo con pure de papas o mix de hojas verdes",
          description: "",
          prices: {
            location1: 9100,
            location2: 9300
          }
        },
        {
          id: 18,
          name: "Ravioles de Pollo y verdura a la manteca con finas hiervas",
          description: "",
          prices: {
            location1: 7550,
            location2: 8250
          }
        },
        {
          id: 19,
          name: "Milanesa deluxe",
          description: "Milanesa de carne con colchon de guacamole y huevo frito acompañada con papas fritas",
          prices: {
            location1: 9100,
            location2: 9100
          }
        },
        {
          id: 20,
          name: "Pizzeta de muzarella de masa madre",
          description: "opcional queso veggie",
          prices: {
            location1: 5900,
            location2: 6300
          }
        }
      ],
      style: "compact"
    },
    {
      id: 4,
      name: "Hamburguesas Caseras",
      subtitle: "Medallón de 200gr acompañadas de papas rusticas",
      image: {
        url: '../assets/burgerandwraps/burgerone.webp',
        position: "bottom", // imagen arriba de la categoría
        alt: "pizza"
      },
      items: [
        {
          id: 21,
          name: "Completa",
          description: "Lechuga, tomate, jamon, queso y huevo a la plancha. Acompañadas con papas",
          prices: {
            location1: 8200,
            location2: 8900
          }
        },
        {
          id: 22,
          name: "De la casa",
          description: "Queso cheddar, mostaza, pepino encurtido y cebolla caramelizadas",
          prices: {
            location1: 8400,
            location2: 8900
          }
        }
      ],
      style: "featured"
    },
    {
      id: 5,
      name: "Nuestros Sandwiches",
      subtitle: "En pan de Ciabatta",
      items: [
        {
          id: 23,
          name: "Buenos Aires",
          description: "Jamon crudo, queso blanco, rúcula y tomates secos",
          prices: {
            location1: 6950,
            location2: 7100
          }
        },
        {
          id: 24,
          name: "Francés",
          description: "Sandwich untado de mayoliva, jamon cocido, queso tybo, lechuga y tomates cherry confitados",
          prices: {
            location1: 7700,
            location2: 7700
          }
        },
        {
          id: 25,
          name: "Florida",
          description: "Pollo grille, provoleta a la plancha, morron confitado, rodajas de remolacha y pesto de cilantro",
          prices: {
            location1: 7800,
            location2: 7900
          }
        }
      ],
      style: "featured"
    },
    {
      id: 6,
      name: "Sandwiches de Milanesa",
      subtitle: "Carne o Pollo",
      items: [
        {
          id: 26,
          name: "Simple",
          prices: {
            location1: 6100,
            location2: 6100
          }
        },
        {
          id: 27,
          name: "Mediano",
          description: "Jamon | Queso | Tomáte | Lechuga - Maximo 2 rellenos a elección",
          prices: {
            location1: 7400,
            location2: 7400
          }
        },
        {
          id: 28,
          name: "Completo",
          description: "Jamon, queso, huevo, tomáte y lechuga",
          prices: {
            location1: 8200,
            location2: 8200
          }
        },
        {
          id: 29,
          name: "Tostado en Pan Arabe",
          description: "Jamon y Queso",
          prices: {
            location1: 4500,
            location2: 4500
          }
        },
        {
          id: 30,
          name: "Tostado en Pan Arabe Mediano",
          description: "Jamon, queso, tomate",
          prices: {
            location1: 4700,
            location2: 4700
          }
        },
        {
          id: 31,
          name: "Pan Arabe Completo",
          description: "Jamon, queso huevo y tomate",
          prices: {
            location1: 4800,
            location2: 4800
          }
        }
      ],
      style: "default"
    },
    {
      id: 7,
      name: "Tartas",
      subtitle: "Acompañadas de mix de hojas",
      items: [
        {
          id: 32,
          name: "Jamon y Muzarella",
          description: "",
          prices: {
            location1: 7800,
            location2: 8500
          }
        },
        {
          id: 33,
          name: "Calabaza y Muzarella",
          description: "",
          prices: {
            location1: 7800,
            location2: 8500
          }
        },
        {
          id: 34,
          name: "Espinaca, queso azul, tomate cherry",
          description: "",
          prices: {
            location1: 7800,
            location2: 8500
          }
        }
      ],
      style: "compact"
    },
    {
      id: 8,
      name: "Wraps",
      subtitle: "Acompañado de papas rusticas",
      image: {
        url: '../assets/burgerandwraps/wrap.webp',
        position: "bottom", // imagen arriba de la categoría
        alt: "pizza"
      },
      items: [
        {
          id: 35,
          name: "Carne desmechada, queso y vegetales asados",
          prices: {
            location1: 8100,
            location2: 8700
          }
        },
        {
          id: 36,
          name: "Vegano",
          description: "Berenjeas asadas, espinaca, cebolla, hummus y lentejas",
          prices: {
            location1: 8100,
            location2: 8700
          }
        }
      ],
      style: "featured"
    },
    {
      id: 9,
      name: "Ensaladas de la Casa",
      image: {
        url: '../assets/ensaladas/finalSalad.webp',
        position: "beside-title", // imagen arriba de la categoría
        alt: "pizza"
      },
      items: [
        {
          id: 37,
          name: "Deluxe",
          description: "Lechuga, tomates cherrys confitados, palta, aceitunas negras, pollo rebozado con panko, mix de semillas.",
          prices: {
            location1: 8600,
            location2: 8850
          }
        },
        {
          id: 38,
          name: "Caesar",
          description: "Tiras de pollo grille, lechuga, queso en hebras, crutones de pan tostado y salsa caesar.",
          prices: {
            location1: 8400,
            location2: 8500
          }
        },
        {
          id: 39,
          name: "De la casa",
          description: "Lomo de atun, arroz, aceitunas negras, tomate cherry, huevo duro, zanahria y choclo.",
          prices: {
            location1: 9200,
            location2: 9200
          }
        },
        {
          id: 40,
          name: "Meeting",
          description: "Rucula, tomates cherry, tiras de jamon crudo, nueces, queso parmesano.",
          prices: {
            location1: 8600,
            location2: 9100
          }
        },
        {
          id: 41,
          name: "Gourmet",
          description: "Lechuga, pollo crocante, tomates secos y palta. Acompañado con salsa de yogurt.",
          prices: {
            location1: 8700,
            location2: 9000
          }
        }
      ],
      style: "default"
    },
    {
      id: 10,
      name: "BigToast",
      subtitle: "Con Exprimido o infusión a elección\nEn pan de Campo",
      image: {
        url: '../assets/bigtoast/btsinbg.webp',
        position: "beside-title", // imagen arriba de la categoría
        alt: "pizza",
        style: "featured",
      },
      items: [
        {
          id: 42,
          name: "Palta",
          description: "huevo benedictino, tomate cherry confitado y queso parmesano",
          prices: {
            location1: 7700,
            location2: 8100
          }
        },
        {
          id: 43,
          name: "Huevo Revuelto",
          description: "jamon, tomate, queso blanco y parmesano",
          prices: {
            location1: 7500,
            location2: 8000
          }
        },
        {
          id: 44,
          name: "Queso blanco",
          description: "polvo de olivas negras, rúcula, lomito de atún y queso parmesano",
          prices: {
            location1: 8000,
            location2: 8200
          }
        },
      ],
      style: "featured"
    },
    {
      id: 11,
      name: "Brusquetas",
      subtitle: "En pan de Campo",
      image: {
        url: '../assets/bigtoast/brusqueta.webp',
        position: "top", // imagen arriba de la categoría
        alt: "brusquetas"
      },
      items: [
        {
          id: 45,
          description: "Con queso blanco, jamón crudo, rúcula y tomates cherry confitados",
          prices: {
            location1: 4200,
            location2: 4350
          }
        },
        {
          id: 46,
          description: "Con deliciosa palta y huevos revueltos",
          prices: {
            location1: 3850,
            location2: 4350
          }
        },
      ],
      style: "featured"
    },
    {
      id: 12,
      name: "Cositas Ricas",
      style: "featured",
      items: [
        {
          id: 47,
          name: "Budin de Pan",
          description: "Con dulce de leche o crema blanca",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 48,
          name: "Chocotorta",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 49,
          name: "Chees Cake",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 50,
          name: "Cookie Oreo",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 51,
          name: "Ensalada de Fruta",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 52,
          name: "Medialuna de Manteca",
          prices: {
            location1: 1300,
            location2: 1300
          }
        },
        {
          id: 53,
          name: "Medialuna rellena con dulce de leche",
          prices: {
            location1: 1500,
            location2: 1500
          }
        },
        {
          id: 54,
          name: "Budines:",
          description: "(Limon, Naranja, Banana y Nuez, Vainilla y Arandanos)",
          prices: {
            location1: 2800,
            location2: 2800
          }
        },
        {
          id: 55,
          name: "Pastafrolla",
          description: "Membrillo",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 56,
          name: "Lemon Pie",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 57,
          name: "Helado",
          prices: {
            location1: 2800,
            location2: 2800
          }
        },
        {
          id: 58,
          name: "Barra de Cereal",
          prices: {
            location1: 2000,
            location2: 2000
          }
        },
        {
          id: 59,
          name: "Cookie - Consultar Sabores disponibles",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
        {
          id: 60,
          name: "Apple Crumble",
          prices: {
            location1: 2800,
            location2: 2800
          }
        },
        {
          id: 61,
          name: "Chipa",
          prices: {
            location1: 2000,
            location2: 2000
          }
        },
        {
          id: 62,
          name: "Vigilante",
          description: "Queso y Dulce (Batata o membrillo)",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
      ]
    },
    {
      id: 13,
      name: "Muffins",
      image: {
        url: '../assets/muffins/muffins.webp',
        position: "bottom", // imagen arriba de la caegoría
        alt: "muffins"
      },
      items: [
        {
          id: 63,
          name: "Vainilla y Chips de Chocolate",
          prices: {
            location1: 2400,
            location2: 2400
          }
        },
        {
          id: 64,
          name: "Chocolate con Chips de Chocolate",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 65,
          name: "Manzana",
          prices: {
            location1: 2700,
            location2: 2700
          }
        },
        {
          id: 66,
          name: "Arandanos",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
      ],
      style: "featured"
    },
    {
      id: 14,
      name: "Alfajores",
      image: {
        url: '../assets/delicias/alfajores.webp',
        position: "beside-title", // imagen arriba de la categoría
        alt: "alfajor"
      },
      items: [
        {
          id: 67,
          name: "Carbon Activado",
          description: "Relleno de Gasnash de chocolate blanco",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
        {
          id: 68,
          name: "Red",
          description: "Rellenos de Nutella",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
        {
          id: 69,
          name: "Chocolate Negro",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 70,
          name: "Chocolate Blanco",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 71,
          name: "Maicena",
          prices: {
            location1: 2500,
            location2: 2500
          }
        },
        {
          id: 72,
          name: "Coco",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
        {
          id: 73,
          name: "Cookie",
          description: "Relleno con Dulce de leche",
          prices: {
            location1: 2600,
            location2: 2600
          }
        },
        {
          id: 74,
          name: "SIN TACC",
          description: "Consultar sabores disponibles",
          prices: {
            location1: 2300,
            location2: 2300
          }
        },
      ],
      style: "featured"
    },
    {
      id: 15,
      name: "Cafetería",
      image: {
        url: '../assets/meriendas/medialunas.webp',
        position: "bottom", // imagen arriba de la categoría
        alt: "medialunas"
      },
      items: [
        {
          id: 75,
          name: "Pocillo",
          description: "",
          prices: {
            location1: 2500,
            location2: 2700
          }
        },
        {
          id: 76,
          name: "Jarrito",
          description: "",
          prices: {
            location1: 2700,
            location2: 2900
          }
        },
        {
          id: 77,
          name: "Cafe Doble",
          description: "",
          prices: {
            location1: 2900,
            location2: 3300
          }
        },
        {
          id: 78,
          name: "Té",
          description: "",
          prices: {
            location1: 2600,
            location2: 3100
          }
        },
        {
          id: 79,
          name: "Té con Leche",
          description: "",
          prices: {
            location1: 2950,
            location2: 3300
          }
        },
        {
          id: 80,
          name: "Chocolatada",
          description: "",
          prices: {
            location1: 2600,
            location2: 3200
          }
        },
        {
          id: 81,
          name: "Submarino",
          description: "",
          prices: {
            location1: 2950,
            location2: 2950
          }
        },
        {
          id: 82,
          name: "Capuchino",
          description: "",
          prices: {
            location1: 2950,
            location2: 3300
          }
        }
      ],
      style: "default"
    },
    {
      id: 16,
      name: "Licuados y Exprimidos",
      items: [
        {
          id: 83,
          name: "Banana",
          description: "",
          prices: {
            location1: 3500,
            location2: 3800
          }
        },
        {
          id: 84,
          name: "Durazno",
          description: "",
          prices: {
            location1: 3600,
            location2: 3850
          }
        },
        {
          id: 85,
          name: "Naranja",
          description: "",
          prices: {
            location1: 3500,
            location2: 3800
          }
        },
        {
          id: 86,
          name: "Limonada",
          description: "",
          prices: {
            location1: 3300,
            location2: 3600
          }
        },
        {
          id: 87,
          name: "Multifruta",
          description: "",
          prices: {
            location1: 3800,
            location2: 4100
          }
        },
        {
          id: 88,
          name: "Jarra de pomelada con lima y Menta",
          description: "",
          prices: {
            location1: 4500,
            location2: 4800
          }
        },
        {
          id: 89,
          name: "Jarra de limonada con menta y Jengibre",
          description: "",
          prices: {
            location1: 4500,
            location2: 4800
          }
        }
      ],
      style: "compact"
    },
    {
      id: 17,
      name: "Opciones Detox",
      subtitle: "Orgánicos y sin conservantes",
      image: {
        url: '../assets/detox/detox.jpeg',
        position: "bottom", // imagen arriba de la categoría
        alt: "detox"
      },
      items: [
        {
          id: 90,
          name: "Green",
          description: "Equilibrio perfecto: Espinaca, manzana verde, anana, pera y limon",
          prices: {
            location1: 3900,
            location2: 4100
          }
        },
        {
          id: 91,
          name: "Orange",
          description: "Nutricion y vitalidad: Zanahoria, naranja roja, jengibre y limon",
          prices: {
            location1: 3900,
            location2: 4100
          }
        },
        {
          id: 92,
          name: "Fresh",
          description: "Sabor y frescura: Limon, pepino, menta y gengibre",
          prices: {
            location1: 3900,
            location2: 4100
          }
        }
      ],
      style: "featured"
    },

    {
      id: 18,
      name: "Bebidas",
      items: [
        {
          id: 93,
          name: "Agua con y sin Gas - Saborizadas",
          description: "",
          prices: {
            location1: 2200,
            location2: 2200
          }
        },
        {
          id: 94,
          name: "Gatorade",
          description: "",
          prices: {
            location1: 2300,
            location2: 2300
          }
        },
        {
          id: 95,
          name: "Pepsi Comun y Black | 7up - 7Up Free | Paso de los toros",
          description: "",
          prices: {
            location1: 2200,
            location2: 2200
          }
        },
        {
          id: 96,
          name: "Stella Artois 1lt",
          description: "",
          prices: {
            location1: 6800,
            location2: 6800
          }
        },
        {
          id: 97,
          name: "Andes 1lt",
          description: "",
          prices: {
            location1: 5600,
            location2: 5600
          }
        }
      ],
      style: "default"
    }
  ],
    locations: [
      {
        id: "location1",
        name: "Harrods&Chaves"
      },
      {
        id: "location2",
        name: "Sanitarias"
      }
    ],
      style: "compact"
  };