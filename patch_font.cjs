const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className="bg-black py-2 md:py-2.5 relative">/,
  `<div className="bg-white border-b border-gray-100 py-2 md:py-2.5 relative">`
);

code = code.replace(
  /<Clock className="w-4 h-4 text-white" \/>/,
  `<Clock className="w-4 h-4 text-black" />`
);

code = code.replace(
  /<span className="font-space font-extrabold text-base sm:text-lg md:text-xl tracking-widest text-white uppercase">/,
  `<span className="font-serif font-extrabold text-base sm:text-lg md:text-xl tracking-widest text-black uppercase">`
);

fs.writeFileSync('src/App.tsx', code);
