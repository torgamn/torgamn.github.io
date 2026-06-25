import { CONSTANTS } from './constants.js';
import { accessICache, accessDCache } from './cache.js';
import { isInstructionVisible } from './assembler.js';
import { logMessage } from './language.js';
import { updateAcUI, updateBUI, updatePcUI, updateVaUI, updateIxUI, updateBpUI, updateVbUI, updateCacheUI, formatNumber } from './ui.js';

export function executeSingleInstruction(state, ui, memorySize) {
    if (state.pc < 0 || state.pc >= memorySize) {
        logMessage('errorPcOutOfBounds', state, ui);
        return 'HALT';
    }
    
    const opcode = accessICache(state.pc, state, ui, memorySize);
    const instr = CONSTANTS.REVERSE_INSTRUCTION_MAP[opcode];
    
    if (!instr || !isInstructionVisible(instr, state.currentModule)) {
        logMessage('errorInvalidOpcode', state, ui, opcode, state.pc);
        return 'HALT';
    }
    
    let arg = 0;
    if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr)) {
        if (state.pc + 1 < memorySize) {
            arg = accessICache(state.pc + 1, state, ui, memorySize);
        }
    }

    const argText = CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr) ? formatNumber(arg, state.displayBase) : '';
    logMessage('executing', state, ui, instr, argText, formatNumber(state.pc, state.displayBase));

    let overrideFlags = false;

    switch (instr) {
        case 'NOP': state.pc++; break;
        case 'STA': accessDCache(arg, state, ui, memorySize, state.ac); state.opcodeMap[arg] = null; state.pc += 2; break;
        case 'LDA': state.ac = accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'ADD': state.ac += accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'OR':  state.ac |= accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'AND': state.ac &= accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'NOT': state.ac = ~state.ac; state.pc++; break;
        case 'JMP': state.pc = arg; break;
        case 'JN': state.pc = state.negativeFlag ? arg : state.pc + 2; break;
        case 'JZ': state.pc = state.zeroFlag ? arg : state.pc + 2; break;
        case 'HLT': logMessage('halted', state, ui); return 'HALT';

        // Expanded instructions
        case 'LDIX': state.ix = accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'STIX': accessDCache(arg, state, ui, memorySize, state.ix); state.opcodeMap[arg] = null; state.pc += 2; break;
        case 'LDBP': state.bp = accessDCache(arg, state, ui, memorySize); state.pc += 2; break;
        case 'STBP': accessDCache(arg, state, ui, memorySize, state.bp); state.opcodeMap[arg] = null; state.pc += 2; break;
        
        case 'LDX':
            state.ac = accessDCache((arg + state.ix) % memorySize, state, ui, memorySize);
            state.pc += 2;
            break;
        case 'STX':
            accessDCache((arg + state.ix) % memorySize, state, ui, memorySize, state.ac);
            state.opcodeMap[(arg + state.ix) % memorySize] = null;
            state.pc += 2;
            break;
        case 'LDBX':
            state.ac = accessDCache((state.bp + state.ix) % memorySize, state, ui, memorySize);
            state.pc += 1;
            break;
        case 'STBX':
            accessDCache((state.bp + state.ix) % memorySize, state, ui, memorySize, state.ac);
            state.opcodeMap[(state.bp + state.ix) % memorySize] = null;
            state.pc += 1;
            break;
            
        case 'LDB':
            state.b = accessDCache(arg, state, ui, memorySize);
            state.pc += 2;
            break;
        case 'STB':
            accessDCache(arg, state, ui, memorySize, state.b);
            state.opcodeMap[arg] = null;
            state.pc += 2;
            break;
        case 'LDI':
            state.ac = arg;
            state.pc += 2;
            break;

        case 'LOOP':
            state.ix = (state.ix - 1) & 0xFF;
            if (state.ix !== 0) {
                state.pc = arg;
            } else {
                state.pc += 2;
            }
            break;

        case 'TAS': {
            const memVal = accessDCache(arg, state, ui, memorySize);
            if (memVal === 0) {
                accessDCache(arg, state, ui, memorySize, 1);
                state.opcodeMap[arg] = null;
                state.zeroFlag = true;
            } else {
                state.zeroFlag = false;
            }
            overrideFlags = true;
            state.pc += 2;
            break;
        }

        case 'VLDA': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) state.va[i] = accessDCache(address + i, state, ui, memorySize);
            }
            state.pc += 2;
            break;
        }
        case 'VSTA': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) {
                    accessDCache(address + i, state, ui, memorySize, state.va[i]);
                    state.opcodeMap[address + i] = null;
                }
            }
            state.pc += 2;
            break;
        }
        case 'VADD': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) state.va[i] = (state.va[i] + accessDCache(address + i, state, ui, memorySize)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VEADD': {
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                state.va[i] = (state.va[i] + state.ac) & 0xFF;
            }
            state.pc++;
            break;
        }
        case 'VOR': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) state.va[i] = (state.va[i] | accessDCache(address + i, state, ui, memorySize)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VAND': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) state.va[i] = (state.va[i] & accessDCache(address + i, state, ui, memorySize)) & 0xFF;
            }
            state.pc += 2;
            break;
        }
        case 'VNOT': {
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                state.va[i] = (~state.va[i]) & 0xFF;
            }
            state.pc++;
            break;
        }
        case 'VLDB': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) state.vb[i] = accessDCache(address + i, state, ui, memorySize);
            }
            state.pc += 2;
            break;
        }
        case 'VSTB': {
            const address = arg;
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                if (address + i < memorySize) {
                    accessDCache(address + i, state, ui, memorySize, state.vb[i]);
                    state.opcodeMap[address + i] = null;
                }
            }
            state.pc += 2;
            break;
        }
        case 'VADDV': {
            for (let i = 0; i < CONSTANTS.VECTOR_REG_SIZE; i++) {
                state.va[i] = (state.va[i] + state.vb[i]) & 0xFF;
            }
            state.pc++;
            break;
        }
    }
    
    const acResult = updateAcUI(state.ac, state.zeroFlag, state.negativeFlag, state.displayBase, ui.acValue, ui.nFlagBox, ui.zFlagBox, overrideFlags);
    state.ac = acResult.ac;
    state.zeroFlag = acResult.zeroFlag;
    state.negativeFlag = acResult.negativeFlag;
    
    state.b = updateBUI(state.b, state.displayBase, ui.bValue);
    updatePcUI(state.pc, state.displayBase, ui.pcValue);
    updateVaUI(state.va, state.displayBase, ui.vaValue);
    updateIxUI(state.ix, state.displayBase, ui.ixValue);
    updateBpUI(state.bp, state.displayBase, ui.bpValue);
    updateVbUI(state.vb, state.displayBase, ui.vbValue);
    updateCacheUI(state.iCache, state.dCache, state.displayBase, ui.icacheHits, ui.icacheMisses, ui.icacheTag, ui.icacheData, ui.dcacheHits, ui.dcacheMisses, ui.dcacheTag, ui.dcacheData);
    return 'CONTINUE';
}

export function resetState(state, ui, iCacheSize, dCacheSize, vectorRegSize) {
    state.ac = 0;
    state.b = 0;
    state.pc = 0;
    state.va = new Array(vectorRegSize).fill(0);
    state.ix = 0;
    state.bp = 0;
    state.vb = new Array(vectorRegSize).fill(0);
    
    state.iCache = { tag: -1, valid: false, data: new Array(iCacheSize).fill(0), hits: 0, misses: 0 };
    state.dCache = { tag: -1, valid: false, data: new Array(dCacheSize).fill(0), hits: 0, misses: 0 };

    const acResult = updateAcUI(state.ac, state.zeroFlag, state.negativeFlag, state.displayBase, ui.acValue, ui.nFlagBox, ui.zFlagBox);
    state.ac = acResult.ac;
    state.zeroFlag = acResult.zeroFlag;
    state.negativeFlag = acResult.negativeFlag;
    
    state.b = updateBUI(state.b, state.displayBase, ui.bValue);
    updatePcUI(state.pc, state.displayBase, ui.pcValue);
    updateVaUI(state.va, state.displayBase, ui.vaValue);
    updateIxUI(state.ix, state.displayBase, ui.ixValue);
    updateBpUI(state.bp, state.displayBase, ui.bpValue);
    updateVbUI(state.vb, state.displayBase, ui.vbValue);
    updateCacheUI(state.iCache, state.dCache, state.displayBase, ui.icacheHits, ui.icacheMisses, ui.icacheTag, ui.icacheData, ui.dcacheHits, ui.dcacheMisses, ui.dcacheTag, ui.dcacheData);
    updateBaseUI(state.displayBase, ui.baseDisplay);
}

function updateBaseUI(displayBase, baseDisplay) {
    baseDisplay.textContent = displayBase === 10 ? 'DEC' : 'HEX';
}