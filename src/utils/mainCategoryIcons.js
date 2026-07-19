import {
    IconLeaf, IconMeat, IconFlame, IconBurger, IconCoffee, IconGlassCocktail,
    IconSnowflake, IconIceCream, IconCandy, IconBottle, IconCup, IconSalad,
    IconPizza, IconFish, IconEgg, IconSoup, IconMilk, IconCake, IconTag,
} from '@tabler/icons-react';

export const ICON_OPTIONS = [
    { key: 'IconLeaf', label: 'Veg', Icon: IconLeaf },
    { key: 'IconMeat', label: 'Non-Veg', Icon: IconMeat },
    { key: 'IconFlame', label: 'Spicy', Icon: IconFlame },
    { key: 'IconBurger', label: 'Fast Food', Icon: IconBurger },
    { key: 'IconCoffee', label: 'Coffee', Icon: IconCoffee },
    { key: 'IconGlassCocktail', label: 'Shakes/Mojito', Icon: IconGlassCocktail },
    { key: 'IconSnowflake', label: 'Ice Crusher', Icon: IconSnowflake },
    { key: 'IconIceCream', label: 'Desserts', Icon: IconIceCream },
    { key: 'IconCandy', label: 'Sweets', Icon: IconCandy },
    { key: 'IconBottle', label: 'Water Bottle', Icon: IconBottle },
    { key: 'IconCup', label: 'Cold Drink', Icon: IconCup },
    { key: 'IconSalad', label: 'Salad', Icon: IconSalad },
    { key: 'IconPizza', label: 'Pizza', Icon: IconPizza },
    { key: 'IconFish', label: 'Seafood', Icon: IconFish },
    { key: 'IconEgg', label: 'Egg', Icon: IconEgg },
    { key: 'IconSoup', label: 'Soup', Icon: IconSoup },
    { key: 'IconMilk', label: 'Dairy', Icon: IconMilk },
    { key: 'IconCake', label: 'Cake', Icon: IconCake },
];

export const ICON_MAP = ICON_OPTIONS.reduce((map, o) => ({ ...map, [o.key]: o.Icon }), {});

export const resolveIcon = (key) => ICON_MAP[key] || IconTag;