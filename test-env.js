#!/usr/bin/env node

console.log('🔍 Environment Test');
console.log('==================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`PORT: ${process.env.PORT || 'undefined'}`);
console.log(`DB_HOST: ${process.env.DB_HOST || 'undefined'}`);

// Test the environment detection logic
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Is Production: ${isProduction}`);

// Test the port logic
const PORT = isProduction ? (process.env.PORT || 3001) : (process.env.PORT || 3000);
console.log(`Calculated PORT: ${PORT}`);

console.log('==================');
console.log('Test completed'); 