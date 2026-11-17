import base from './playwright.config.js';
export default {...base,testMatch:[process.env.SCRATCH||'_scratch-revb.spec.js'],reporter:[['line']]};
