// The built-in food library: common foods picked from USDA FoodData Central
// "SR Legacy" (April 2018 release). Each entry names the USDA food by its
// FDC ID, gives it a friendlier name, and sets a typical serving. Gram
// weights come from USDA's own portion table for that food.
//
// To change the library, edit this list and re-run the build script
// (see scripts/build-food-library.ts).

export type FoodSelection = {
  fdcId: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  grams: number;
};

export const FOOD_SELECTION: FoodSelection[] = [
  // Grains & cereals
  { fdcId: 173904, name: "Rolled oats, dry", servingSize: 0.5, servingUnit: "cup", grams: 40.5 },
  { fdcId: 171662, name: "Instant oatmeal, made with water", servingSize: 1, servingUnit: "cup", grams: 234 },
  { fdcId: 169704, name: "Brown rice, cooked", servingSize: 1, servingUnit: "cup", grams: 202 },
  { fdcId: 168878, name: "White rice, cooked", servingSize: 1, servingUnit: "cup", grams: 158 },
  { fdcId: 168917, name: "Quinoa, cooked", servingSize: 1, servingUnit: "cup", grams: 185 },
  { fdcId: 172688, name: "Whole wheat bread", servingSize: 1, servingUnit: "slice", grams: 32 },
  { fdcId: 174924, name: "White bread", servingSize: 1, servingUnit: "slice", grams: 29 },
  { fdcId: 169737, name: "Pasta, cooked", servingSize: 1, servingUnit: "cup", grams: 124 },
  { fdcId: 168910, name: "Whole wheat pasta, cooked", servingSize: 1, servingUnit: "cup", grams: 117 },
  { fdcId: 175036, name: "Corn tortilla", servingSize: 1, servingUnit: "tortilla", grams: 24 },
  { fdcId: 175037, name: "Flour tortilla", servingSize: 1, servingUnit: "tortilla", grams: 48 },
  { fdcId: 174899, name: "Bagel, plain", servingSize: 1, servingUnit: "bagel", grams: 99 },
  { fdcId: 173884, name: "Cheerios cereal", servingSize: 1, servingUnit: "cup", grams: 28 },

  // Protein foods
  { fdcId: 171477, name: "Chicken breast, roasted", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 174032, name: "Ground beef (85% lean), cooked", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 175168, name: "Salmon, cooked", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 173709, name: "Tuna, canned in water", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 171971, name: "Shrimp, cooked", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 171956, name: "Cod, cooked", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 175139, name: "Sardines, canned in oil", servingSize: 1, servingUnit: "can (3.75 oz)", grams: 92 },
  { fdcId: 171496, name: "Turkey breast, roasted", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 168285, name: "Pork loin chop, cooked", servingSize: 3, servingUnit: "oz", grams: 85 },
  { fdcId: 171287, name: "Egg", servingSize: 1, servingUnit: "large", grams: 50 },
  { fdcId: 173424, name: "Egg, hard-boiled", servingSize: 1, servingUnit: "large", grams: 50 },
  { fdcId: 172475, name: "Tofu, firm", servingSize: 0.5, servingUnit: "cup", grams: 126 },
  { fdcId: 174272, name: "Tempeh", servingSize: 0.5, servingUnit: "cup", grams: 83 },
  { fdcId: 172421, name: "Lentils, cooked", servingSize: 1, servingUnit: "cup", grams: 198 },
  { fdcId: 173757, name: "Chickpeas, cooked", servingSize: 1, servingUnit: "cup", grams: 164 },
  { fdcId: 173735, name: "Black beans, cooked", servingSize: 1, servingUnit: "cup", grams: 172 },
  { fdcId: 175194, name: "Kidney beans, cooked", servingSize: 1, servingUnit: "cup", grams: 177 },
  { fdcId: 168411, name: "Edamame, prepared", servingSize: 1, servingUnit: "cup", grams: 155 },

  // Dairy & alternatives
  { fdcId: 171267, name: "Milk, 2%", servingSize: 1, servingUnit: "cup", grams: 244 },
  { fdcId: 171265, name: "Milk, whole", servingSize: 1, servingUnit: "cup", grams: 244 },
  { fdcId: 175215, name: "Soy milk, unsweetened", servingSize: 1, servingUnit: "cup", grams: 243 },
  { fdcId: 174832, name: "Almond milk, unsweetened", servingSize: 1, servingUnit: "cup", grams: 262 },
  { fdcId: 170894, name: "Greek yogurt, plain nonfat", servingSize: 1, servingUnit: "container (6 oz)", grams: 170 },
  { fdcId: 170886, name: "Yogurt, plain low-fat", servingSize: 1, servingUnit: "cup", grams: 245 },
  { fdcId: 173414, name: "Cheddar cheese", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 170847, name: "Mozzarella, part-skim", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 172182, name: "Cottage cheese, 2%", servingSize: 0.5, servingUnit: "cup", grams: 113 },
  { fdcId: 167575, name: "Vanilla ice cream", servingSize: 0.5, servingUnit: "cup", grams: 66 },

  // Vegetables
  { fdcId: 168462, name: "Spinach, raw", servingSize: 1, servingUnit: "cup", grams: 30 },
  { fdcId: 168463, name: "Spinach, cooked", servingSize: 1, servingUnit: "cup", grams: 180 },
  { fdcId: 168421, name: "Kale, raw", servingSize: 1, servingUnit: "cup", grams: 21 },
  { fdcId: 170379, name: "Broccoli, raw", servingSize: 1, servingUnit: "cup chopped", grams: 91 },
  { fdcId: 169967, name: "Broccoli, cooked", servingSize: 0.5, servingUnit: "cup chopped", grams: 78 },
  { fdcId: 169986, name: "Cauliflower, raw", servingSize: 1, servingUnit: "cup chopped", grams: 107 },
  { fdcId: 169971, name: "Brussels sprouts, cooked", servingSize: 0.5, servingUnit: "cup", grams: 78 },
  { fdcId: 168390, name: "Asparagus, cooked", servingSize: 0.5, servingUnit: "cup", grams: 90 },
  { fdcId: 170393, name: "Carrots, raw", servingSize: 1, servingUnit: "cup chopped", grams: 128 },
  { fdcId: 168483, name: "Sweet potato, baked", servingSize: 1, servingUnit: "medium", grams: 114 },
  { fdcId: 170093, name: "Potato, baked with skin", servingSize: 1, servingUnit: "medium", grams: 173 },
  { fdcId: 170457, name: "Tomato, raw", servingSize: 1, servingUnit: "cup chopped", grams: 180 },
  { fdcId: 170108, name: "Red bell pepper, raw", servingSize: 1, servingUnit: "cup chopped", grams: 149 },
  { fdcId: 168409, name: "Cucumber, raw", servingSize: 0.5, servingUnit: "cup sliced", grams: 52 },
  { fdcId: 169247, name: "Romaine lettuce", servingSize: 1, servingUnit: "cup shredded", grams: 47 },
  { fdcId: 171706, name: "Avocado", servingSize: 0.5, servingUnit: "fruit", grams: 68 },
  { fdcId: 170017, name: "Green peas, cooked", servingSize: 0.5, servingUnit: "cup", grams: 80 },
  { fdcId: 169999, name: "Sweet corn, cooked", servingSize: 1, servingUnit: "cup", grams: 149 },
  { fdcId: 169291, name: "Zucchini, raw", servingSize: 1, servingUnit: "cup chopped", grams: 124 },
  { fdcId: 169251, name: "Mushrooms, raw", servingSize: 1, servingUnit: "cup sliced", grams: 70 },
  { fdcId: 170000, name: "Onion, raw", servingSize: 0.5, servingUnit: "cup chopped", grams: 80 },
  { fdcId: 169146, name: "Beets, cooked", servingSize: 0.5, servingUnit: "cup sliced", grams: 85 },

  // Fruit
  { fdcId: 173944, name: "Banana", servingSize: 1, servingUnit: "medium", grams: 118 },
  { fdcId: 171688, name: "Apple", servingSize: 1, servingUnit: "medium", grams: 182 },
  { fdcId: 169097, name: "Orange", servingSize: 1, servingUnit: "fruit", grams: 131 },
  { fdcId: 169118, name: "Pear", servingSize: 1, servingUnit: "medium", grams: 178 },
  { fdcId: 169928, name: "Peach", servingSize: 1, servingUnit: "medium", grams: 150 },
  { fdcId: 168153, name: "Kiwi", servingSize: 1, servingUnit: "fruit", grams: 69 },
  { fdcId: 167762, name: "Strawberries", servingSize: 1, servingUnit: "cup halves", grams: 152 },
  { fdcId: 171711, name: "Blueberries", servingSize: 1, servingUnit: "cup", grams: 148 },
  { fdcId: 167755, name: "Raspberries", servingSize: 1, servingUnit: "cup", grams: 123 },
  { fdcId: 174683, name: "Grapes", servingSize: 1, servingUnit: "cup", grams: 151 },
  { fdcId: 169910, name: "Mango", servingSize: 1, servingUnit: "cup pieces", grams: 165 },
  { fdcId: 169124, name: "Pineapple", servingSize: 1, servingUnit: "cup chunks", grams: 165 },
  { fdcId: 167765, name: "Watermelon", servingSize: 1, servingUnit: "cup diced", grams: 152 },
  { fdcId: 168191, name: "Medjool date", servingSize: 1, servingUnit: "date", grams: 24 },
  { fdcId: 168165, name: "Raisins", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 169098, name: "Orange juice", servingSize: 1, servingUnit: "cup", grams: 248 },

  // Nuts, seeds & fats
  { fdcId: 170567, name: "Almonds", servingSize: 1, servingUnit: "oz (23 almonds)", grams: 28.35 },
  { fdcId: 170187, name: "Walnuts", servingSize: 1, servingUnit: "oz (14 halves)", grams: 28.35 },
  { fdcId: 170162, name: "Cashews", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 172470, name: "Peanut butter", servingSize: 2, servingUnit: "tbsp", grams: 32 },
  { fdcId: 170554, name: "Chia seeds", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 169414, name: "Flaxseed, ground", servingSize: 1, servingUnit: "tbsp", grams: 7 },
  { fdcId: 170556, name: "Pumpkin seeds", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 170562, name: "Sunflower seeds", servingSize: 0.25, servingUnit: "cup", grams: 35 },
  { fdcId: 170189, name: "Tahini", servingSize: 1, servingUnit: "tbsp", grams: 15 },
  { fdcId: 174289, name: "Hummus", servingSize: 2, servingUnit: "tbsp", grams: 30 },
  { fdcId: 171413, name: "Olive oil", servingSize: 1, servingUnit: "tbsp", grams: 13.5 },
  { fdcId: 173410, name: "Butter", servingSize: 1, servingUnit: "tbsp", grams: 14.2 },

  // Snacks, sweets & drinks
  { fdcId: 170273, name: "Dark chocolate (70-85%)", servingSize: 1, servingUnit: "oz", grams: 28.35 },
  { fdcId: 167542, name: "Granola bar", servingSize: 1, servingUnit: "bar", grams: 25 },
  { fdcId: 169677, name: "Potato chips", servingSize: 1, servingUnit: "oz", grams: 28 },
  { fdcId: 172716, name: "Chocolate chip cookie", servingSize: 1, servingUnit: "cookie", grams: 12.2 },
  { fdcId: 170317, name: "Cheese pizza", servingSize: 1, servingUnit: "slice", grams: 81 },
  { fdcId: 169640, name: "Honey", servingSize: 1, servingUnit: "tbsp", grams: 21 },
  { fdcId: 169661, name: "Maple syrup", servingSize: 1, servingUnit: "tbsp", grams: 20 },
  { fdcId: 171890, name: "Coffee, brewed", servingSize: 1, servingUnit: "cup (8 fl oz)", grams: 237 },
];
