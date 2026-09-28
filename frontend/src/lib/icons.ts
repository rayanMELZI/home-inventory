/**
 * Picture presets for items.
 *
 * Emoji rather than image files: they are text, so an item's picture is a
 * couple of bytes that syncs, backs up and exports like its name does, and
 * it works offline with nothing to download. Each device draws them in its
 * own style, which is fine for telling the rice from the pasta at a glance.
 */

export interface IconGroup {
  label: string;
  icons: { icon: string; name: string }[];
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: "Vegetables",
    icons: [
      { icon: "🍅", name: "tomato" },
      { icon: "🥕", name: "carrot" },
      { icon: "🥔", name: "potato" },
      { icon: "🧅", name: "onion" },
      { icon: "🧄", name: "garlic" },
      { icon: "🥒", name: "cucumber" },
      { icon: "🫑", name: "pepper" },
      { icon: "🌶️", name: "chili" },
      { icon: "🥦", name: "broccoli" },
      { icon: "🥬", name: "lettuce" },
      { icon: "🍆", name: "aubergine eggplant" },
      { icon: "🌽", name: "corn" },
      { icon: "🍄", name: "mushroom" },
      { icon: "🥑", name: "avocado" },
      { icon: "🫛", name: "peas beans" },
      { icon: "🫚", name: "ginger" },
    ],
  },
  {
    label: "Fruit",
    icons: [
      { icon: "🍎", name: "apple" },
      { icon: "🍐", name: "pear" },
      { icon: "🍊", name: "orange clementine" },
      { icon: "🍋", name: "lemon" },
      { icon: "🍌", name: "banana" },
      { icon: "🍇", name: "grape" },
      { icon: "🍓", name: "strawberry" },
      { icon: "🫐", name: "blueberry" },
      { icon: "🍒", name: "cherry" },
      { icon: "🍑", name: "peach" },
      { icon: "🍉", name: "watermelon" },
      { icon: "🍍", name: "pineapple" },
      { icon: "🥭", name: "mango" },
      { icon: "🥝", name: "kiwi" },
      { icon: "🥥", name: "coconut" },
    ],
  },
  {
    label: "Pasta, grains & bread",
    icons: [
      { icon: "🍝", name: "pasta spaghetti penne" },
      { icon: "🍜", name: "noodle ramen" },
      { icon: "🍚", name: "rice" },
      { icon: "🌾", name: "flour wheat semolina couscous" },
      { icon: "🥣", name: "cereal oat muesli" },
      { icon: "🍞", name: "bread" },
      { icon: "🥖", name: "baguette" },
      { icon: "🥐", name: "croissant" },
      { icon: "🫓", name: "flatbread tortilla" },
      { icon: "🫘", name: "bean lentil chickpea" },
    ],
  },
  {
    label: "Dairy & eggs",
    icons: [
      { icon: "🥛", name: "milk" },
      { icon: "🧀", name: "cheese" },
      { icon: "🧈", name: "butter" },
      { icon: "🥚", name: "egg" },
      { icon: "🍦", name: "yogurt yoghurt cream" },
    ],
  },
  {
    label: "Meat & fish",
    icons: [
      { icon: "🍗", name: "chicken" },
      { icon: "🥩", name: "beef steak meat" },
      { icon: "🥓", name: "bacon" },
      { icon: "🌭", name: "sausage" },
      { icon: "🐟", name: "fish salmon" },
      { icon: "🦐", name: "shrimp prawn" },
    ],
  },
  {
    label: "Pantry & drinks",
    icons: [
      { icon: "🫒", name: "olive oil" },
      { icon: "🧂", name: "salt spice" },
      { icon: "🍯", name: "honey jam" },
      { icon: "🍫", name: "chocolate" },
      { icon: "🍪", name: "biscuit cookie" },
      { icon: "🥜", name: "peanut nut" },
      { icon: "🥫", name: "can tin sauce" },
      { icon: "🫙", name: "jar" },
      { icon: "☕", name: "coffee" },
      { icon: "🍵", name: "tea" },
      { icon: "🧃", name: "juice" },
      { icon: "💧", name: "water" },
      { icon: "🧊", name: "frozen ice" },
    ],
  },
];

const ALL = ICON_GROUPS.flatMap((group) => group.icons);

/**
 * A best guess from the name, so "Cherry tomatoes" arrives with a tomato
 * without anyone opening the picker. Keywords only match at the start of a
 * word ("tea" is not in "steak"), and the longest one wins, so "pineapple"
 * is not an apple and "eggplant" is not an egg.
 */
export function guessIcon(itemName: string): string | null {
  const words = itemName.toLowerCase().split(/[^\p{L}]+/u);
  let best: { icon: string; length: number } | null = null;
  for (const { icon, name } of ALL) {
    for (const keyword of name.split(" ")) {
      const hit = words.some((word) => word.startsWith(keyword));
      if (hit && keyword.length > (best?.length ?? 0)) {
        best = { icon, length: keyword.length };
      }
    }
  }
  return best?.icon ?? null;
}
