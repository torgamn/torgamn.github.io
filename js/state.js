import { CONSTANTS } from './constants.js';

const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const state = {
    memory: new Array(CONSTANTS.MEMORY_SIZE).fill(0),
    opcodeMap: new Array(CONSTANTS.MEMORY_SIZE).fill(null),
    pc: 0,
    ac: 0,
    b: 0,
    va: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0),
    ix: 0,
    bp: 0,
    vb: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0),
    zeroFlag: true,
    negativeFlag: false,
    
    // Concorrência / Threads
    currentThreadId: 0,
    coreId: 0,
    threads: [
        { active: true, pc: 0, ac: 0, b: 0, va: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), ix: 0, bp: 0, vb: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), ix: 0, bp: 0, vb: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), ix: 0, bp: 0, vb: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), ix: 0, bp: 0, vb: new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0), zeroFlag: true, negativeFlag: false }
    ],

    isStepMode: false,
    displayBase: 10,
    leftInputBase: 10,
    currentLanguage: (navigator.language.toLowerCase().startsWith('pt')) ? 'pt' : 'en',
    currentModule: 'expanded',
    currentTheme: systemPrefersDark ? 'dark' : 'light',
    syntaxColors: null,
    languageStrings: {},
    iCache: { tag: -1, valid: false, data: new Array(CONSTANTS.I_CACHE_SIZE).fill(0), hits: 0, misses: 0 },
    dCache: { tag: -1, valid: false, data: new Array(CONSTANTS.D_CACHE_SIZE).fill(0), hits: 0, misses: 0 }
};