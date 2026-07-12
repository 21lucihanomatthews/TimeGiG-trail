const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="flex items-center space-x-1.5 p-1 pr-1.5 rounded-full border border-gray-800 hover:border-gray-700 bg-gray-950 hover:bg-gray-900 transition-all duration-300 focus:outline-none shrink-0 shadow-xs"/,
  `className="flex items-center space-x-1.5 p-1 pr-1.5 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none shrink-0 shadow-xs"`
);

code = code.replace(
  /<MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-white" \/>/,
  `<MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-black" />`
);

fs.writeFileSync('src/App.tsx', code);
