// ============================================================
//  BASE DE DONNÉES DES INGRÉDIENTS (kcal / 100g)
// ============================================================

const INGREDIENTS_DB = [
  // CÉRÉALES & FÉCULENTS
  { id: "ing_001", name: "Riz blanc cuit", kcal: 130, category: "Céréales & Féculents" },
  { id: "ing_002", name: "Riz brun cuit", kcal: 112, category: "Céréales & Féculents" },
  { id: "ing_003", name: "Pâtes cuites", kcal: 131, category: "Céréales & Féculents" },
  { id: "ing_004", name: "Pâtes sèches", kcal: 352, category: "Céréales & Féculents" },
  { id: "ing_005", name: "Pain blanc", kcal: 265, category: "Céréales & Féculents" },
  { id: "ing_006", name: "Pain complet", kcal: 247, category: "Céréales & Féculents" },
  { id: "ing_007", name: "Flocons d'avoine", kcal: 370, category: "Céréales & Féculents" },
  { id: "ing_008", name: "Quinoa cuit", kcal: 120, category: "Céréales & Féculents" },
  { id: "ing_009", name: "Pomme de terre cuite", kcal: 87, category: "Céréales & Féculents" },
  { id: "ing_010", name: "Patate douce cuite", kcal: 90, category: "Céréales & Féculents" },
  { id: "ing_011", name: "Farine de blé", kcal: 364, category: "Céréales & Féculents" },
  { id: "ing_012", name: "Semoule cuite", kcal: 112, category: "Céréales & Féculents" },

  // VIANDES & POISSONS
  { id: "ing_101", name: "Poulet blanc cuit", kcal: 165, category: "Viandes & Poissons" },
  { id: "ing_102", name: "Bœuf haché 5%", kcal: 137, category: "Viandes & Poissons" },
  { id: "ing_103", name: "Bœuf haché 15%", kcal: 215, category: "Viandes & Poissons" },
  { id: "ing_104", name: "Saumon cuit", kcal: 208, category: "Viandes & Poissons" },
  { id: "ing_105", name: "Thon en boîte (eau)", kcal: 116, category: "Viandes & Poissons" },
  { id: "ing_106", name: "Cabillaud cuit", kcal: 105, category: "Viandes & Poissons" },
  { id: "ing_107", name: "Crevettes cuites", kcal: 99, category: "Viandes & Poissons" },
  { id: "ing_108", name: "Œuf entier", kcal: 155, category: "Viandes & Poissons" },
  { id: "ing_109", name: "Jambon blanc", kcal: 107, category: "Viandes & Poissons" },
  { id: "ing_110", name: "Dinde cuite", kcal: 135, category: "Viandes & Poissons" },
  { id: "ing_111", name: "Porc filet cuit", kcal: 143, category: "Viandes & Poissons" },
  { id: "ing_112", name: "Sardine en boîte", kcal: 208, category: "Viandes & Poissons" },

  // LÉGUMES
  { id: "ing_201", name: "Tomate", kcal: 18, category: "Légumes" },
  { id: "ing_202", name: "Concombre", kcal: 15, category: "Légumes" },
  { id: "ing_203", name: "Salade verte", kcal: 15, category: "Légumes" },
  { id: "ing_204", name: "Épinards", kcal: 23, category: "Légumes" },
  { id: "ing_205", name: "Brocoli cuit", kcal: 35, category: "Légumes" },
  { id: "ing_206", name: "Carottes crues", kcal: 41, category: "Légumes" },
  { id: "ing_207", name: "Courgette cuite", kcal: 17, category: "Légumes" },
  { id: "ing_208", name: "Poivron rouge", kcal: 31, category: "Légumes" },
  { id: "ing_209", name: "Oignon", kcal: 40, category: "Légumes" },
  { id: "ing_210", name: "Ail", kcal: 149, category: "Légumes" },
  { id: "ing_211", name: "Champignons", kcal: 22, category: "Légumes" },
  { id: "ing_212", name: "Petits pois cuits", kcal: 84, category: "Légumes" },
  { id: "ing_213", name: "Haricots verts cuits", kcal: 35, category: "Légumes" },
  { id: "ing_214", name: "Aubergine cuite", kcal: 35, category: "Légumes" },
  { id: "ing_215", name: "Céleri", kcal: 16, category: "Légumes" },
  { id: "ing_216", name: "Poireau cuit", kcal: 31, category: "Légumes" },

  // FRUITS
  { id: "ing_301", name: "Pomme", kcal: 52, category: "Fruits" },
  { id: "ing_302", name: "Banane", kcal: 89, category: "Fruits" },
  { id: "ing_303", name: "Orange", kcal: 47, category: "Fruits" },
  { id: "ing_304", name: "Fraise", kcal: 32, category: "Fruits" },
  { id: "ing_305", name: "Raisin", kcal: 67, category: "Fruits" },
  { id: "ing_306", name: "Mangue", kcal: 60, category: "Fruits" },
  { id: "ing_307", name: "Kiwi", kcal: 61, category: "Fruits" },
  { id: "ing_308", name: "Avocat", kcal: 160, category: "Fruits" },
  { id: "ing_309", name: "Myrtilles", kcal: 57, category: "Fruits" },
  { id: "ing_310", name: "Poire", kcal: 57, category: "Fruits" },
  { id: "ing_311", name: "Ananas", kcal: 50, category: "Fruits" },
  { id: "ing_312", name: "Pastèque", kcal: 30, category: "Fruits" },

  // PRODUITS LAITIERS
  { id: "ing_401", name: "Lait demi-écrémé", kcal: 46, category: "Produits Laitiers" },
  { id: "ing_402", name: "Yaourt nature", kcal: 59, category: "Produits Laitiers" },
  { id: "ing_403", name: "Fromage blanc 0%", kcal: 44, category: "Produits Laitiers" },
  { id: "ing_404", name: "Fromage blanc 3%", kcal: 67, category: "Produits Laitiers" },
  { id: "ing_405", name: "Emmental râpé", kcal: 380, category: "Produits Laitiers" },
  { id: "ing_406", name: "Mozzarella", kcal: 280, category: "Produits Laitiers" },
  { id: "ing_407", name: "Parmesan", kcal: 431, category: "Produits Laitiers" },
  { id: "ing_408", name: "Crème fraîche 15%", kcal: 162, category: "Produits Laitiers" },
  { id: "ing_409", name: "Crème fraîche 30%", kcal: 292, category: "Produits Laitiers" },
  { id: "ing_410", name: "Beurre", kcal: 717, category: "Produits Laitiers" },
  { id: "ing_411", name: "Feta", kcal: 264, category: "Produits Laitiers" },

  // LÉGUMINEUSES
  { id: "ing_501", name: "Lentilles cuites", kcal: 116, category: "Légumineuses" },
  { id: "ing_502", name: "Pois chiches cuits", kcal: 164, category: "Légumineuses" },
  { id: "ing_503", name: "Haricots rouges cuits", kcal: 127, category: "Légumineuses" },
  { id: "ing_504", name: "Haricots blancs cuits", kcal: 139, category: "Légumineuses" },
  { id: "ing_505", name: "Edamame", kcal: 121, category: "Légumineuses" },
  { id: "ing_506", name: "Tofu nature", kcal: 76, category: "Légumineuses" },

  // MATIÈRES GRASSES
  { id: "ing_601", name: "Huile d'olive", kcal: 884, category: "Matières Grasses" },
  { id: "ing_602", name: "Huile de tournesol", kcal: 884, category: "Matières Grasses" },
  { id: "ing_603", name: "Huile de coco", kcal: 862, category: "Matières Grasses" },
  { id: "ing_604", name: "Margarine", kcal: 717, category: "Matières Grasses" },

  // SUCRES & DOUCEURS
  { id: "ing_701", name: "Sucre blanc", kcal: 387, category: "Sucres & Douceurs" },
  { id: "ing_702", name: "Miel", kcal: 304, category: "Sucres & Douceurs" },
  { id: "ing_703", name: "Chocolat noir 70%", kcal: 598, category: "Sucres & Douceurs" },
  { id: "ing_704", name: "Chocolat au lait", kcal: 535, category: "Sucres & Douceurs" },
  { id: "ing_705", name: "Confiture", kcal: 250, category: "Sucres & Douceurs" },
  { id: "ing_706", name: "Nutella", kcal: 530, category: "Sucres & Douceurs" },

  // NOIX & GRAINES
  { id: "ing_801", name: "Amandes", kcal: 579, category: "Noix & Graines" },
  { id: "ing_802", name: "Noix", kcal: 654, category: "Noix & Graines" },
  { id: "ing_803", name: "Noisettes", kcal: 628, category: "Noix & Graines" },
  { id: "ing_804", name: "Graines de chia", kcal: 486, category: "Noix & Graines" },
  { id: "ing_805", name: "Graines de tournesol", kcal: 584, category: "Noix & Graines" },
  { id: "ing_806", name: "Beurre de cacahuète", kcal: 588, category: "Noix & Graines" },
  { id: "ing_807", name: "Cacahuètes", kcal: 567, category: "Noix & Graines" },

  // BOISSONS
  { id: "ing_901", name: "Jus d'orange", kcal: 45, category: "Boissons" },
  { id: "ing_902", name: "Lait végétal avoine", kcal: 45, category: "Boissons" },
  { id: "ing_903", name: "Lait végétal amande", kcal: 24, category: "Boissons" },
  { id: "ing_904", name: "Café (sans sucre)", kcal: 2, category: "Boissons" },
  { id: "ing_905", name: "Jus de pomme", kcal: 46, category: "Boissons" },

  // CONDIMENTS
  { id: "ing_1001", name: "Ketchup", kcal: 112, category: "Condiments" },
  { id: "ing_1002", name: "Mayonnaise", kcal: 680, category: "Condiments" },
  { id: "ing_1003", name: "Moutarde", kcal: 66, category: "Condiments" },
  { id: "ing_1004", name: "Sauce soja", kcal: 53, category: "Condiments" },
  { id: "ing_1005", name: "Vinaigre balsamique", kcal: 88, category: "Condiments" },
  { id: "ing_1006", name: "Coulis de tomate", kcal: 30, category: "Condiments" },
  { id: "ing_1007", name: "Crème de coco", kcal: 330, category: "Condiments" },
];

const INGREDIENT_CATEGORIES = [
  "Céréales & Féculents",
  "Viandes & Poissons",
  "Légumes",
  "Fruits",
  "Produits Laitiers",
  "Légumineuses",
  "Matières Grasses",
  "Sucres & Douceurs",
  "Noix & Graines",
  "Boissons",
  "Condiments"
];
