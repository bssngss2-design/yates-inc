import { Product } from '@/types';

export const products: Product[] = [
  {
    id: 1,
    name: 'Customizable Photoshops (CPS)',
    price: 'Custom',
    priceFloat: 0,
    image: '/misc/Supper yates.png',
    images: ['/misc/Supper yates.png', '/misc/msG.png', '/misc/yatesdollars.png'],
    isCustom: true,
    hasAddToCart: false,
  },
  {
    id: 2,
    name: 'Glass Table',
    price: '$50.13',
    priceFloat: 50.13,
    hoverText: 'requires assembly',
    image: '/misc/unnamed.jpg',
    hasAddToCart: true,
  },
  {
    id: 3,
    name: 'Watering Can',
    price: '$15.10',
    priceFloat: 15.10,
    hoverText: 'per pound you weigh',
    image: '/products/wateringcan.png',
    hasAddToCart: true,
  },
  {
    id: 4,
    name: 'Silverware',
    price: '$30.23',
    priceFloat: 30.23,
    hoverText: 'per meal you ever eaten',
    image: '/products/silverware.jpg',
    hasAddToCart: true,
  },
  {
    id: 5,
    name: 'Rolling Pin',
    price: '$43.76',
    priceFloat: 43.76,
    hoverText: 'per time you have baked something',
    image: '/products/rp.png',
    hasAddToCart: true,
  },
  {
    id: 6,
    name: 'Custom Key',
    price: '$27.97',
    priceFloat: 27.97,
    hoverText: 'per time you use a key',
    image: '/products/ck.png',
    hasAddToCart: true,
  },
  {
    id: 7,
    name: 'Fancy Flippers',
    price: '$41.99',
    priceFloat: 41.99,
    hoverText: 'per time you touch or drink water',
    image: '/products/flipper.jpg',
    hasAddToCart: true,
  },
  {
    id: 8,
    name: 'Toilet アトマティックシートウォーマー',
    price: '$399.99',
    priceFloat: 399.99,
    hoverText: 'per time you go to the bathroom',
    image: '/products/taw.jpg',
    hasAddToCart: true,
  },
  {
    id: 9,
    name: 'Touilotu Papu',
    price: '$12.89',
    priceFloat: 12.89,
    hoverText: 'per inch of paper you use from the time you buyed this',
    image: '/products/tp.jpg',
    hasAddToCart: true,
  },
  {
    id: 10,
    name: 'Very Safe Door',
    price: '$89.99',
    priceFloat: 89.99,
    hoverText: 'per time you use a door',
    image: '/products/door.png',
    hasAddToCart: true,
  },
];

export const employees = [
  {
    id: '000000',
    name: 'Nesh',
    role: 'Head Master',
    bio: 'Nesh is the true Head Master of Yates Co. This majestic dog handles all very important requests and makes the critical choices that shape the company. If you need something approved, Nesh is who you talk to. Woof.',
    images: ['/misc/nesh-1.jpeg', '/misc/nesh-2.jpeg', '/misc/nesh-3.jpeg'],
  },
  {
    id: '000001',
    name: 'Logan Wall Fencer',
    role: 'CEO',
    bio: 'Logan, is the CEO and founder of Yates Co. He has spend a lot of time and effort, making this the greatest company he could every think of.',
  },
  {
    id: '123456',
    name: 'Bernardo',
    role: 'CTO/CFO',
    bio: "Bernardo works in two areas. First, he's our Chief Technology Officer handling all tech and development. Second, he's our Chief Financial Officer managing all the money coming in and out.",
  },
  {
    id: '007411',
    name: 'Dylan Mad Hawk',
    role: 'PSM',
    bio: "Dylan is our latest hire, but he is very hard working, he handles everything of managing the resources and putting them into our products, with the requirements made from the other companies/MMM's design.",
  },
  {
    id: '674121',
    name: 'Harris',
    role: 'SCM',
    bio: "Harris is our Supply Chain Manager. While he has some basic coding skills, his real strength is managing the supply chain and logistics. He handles all our partnerships, vendor relationships, and ensures resources flow smoothly to keep operations running.",
  },
  {
    id: '319736',
    name: 'Wyatt',
    role: 'LW',
    bio: "With 5 years of experience in law, and very tuff blue hair.",
  },
  {
    id: '010101',
    name: 'Suhas',
    role: 'Bug Finder',
    bio: "Our newest hire. Suhas was a normal customer but became the customer with the most amount of hours, and has given us many feedbacks as a customer so we hired him as our bug finder.",
  },
];

export const firedEmployees = [
  {
    id: '39187',
    name: 'Mr. Michael Mackenzy McKale Mackelayne',
    role: 'Former CPS/HR, and Co-Founder',
    bio: "Michael WAS a hard working man, who not only worked to improve this company but also was the main CEO of the company the true person who came up with this idea. And due to his kindness, he stepped down on the 2nd year of the company as CEO and became a normal employee. But after 10 years of working with us his speed, and reliability has became a lot worse, and as such the company has decided to fire him.",
    anchor: 'MMMM',
  },
];

export function calculateDeliveryTime(numProducts: number): string {
  const days = 1 + (numProducts - 1) * 2;
  
  if (days > 30) {
    return '1 Month';
  } else {
    return `${days} days`;
  }
}

