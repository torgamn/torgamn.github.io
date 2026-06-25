import { CONSTANTS } from './constants.js';
import { accessICache, accessDCache } from './cache.js';
import { isInstructionVisible } from './assembler.js';
import { logMessage } from './language.js';
import { updateAcUI, updateBUI, updatePcUI, updateVaUI, updateIxUI, updateBpUI, updateVbUI, updateCacheUI, formatNumber, updateTidUI } from './ui.js';

// Funções utilitárias para escalonamento
function saveContext(state) {
    const t = state.threads[state.currentThreadId];
    t.pc = state.pc;
    t.ac = state.ac;
    t.b = state.b;
    t.va = [...state.va];
    t.ix = state.ix;
    t.bp = state.bp;
    t.vb = [...state.vb];
    t.zeroFlag = state.zeroFlag;
    t.negativeFlag = state.negativeFlag;
}

function restoreContext(state) {
    const t = state.threads[state.currentThreadId];
    state.pc = t.pc;
    state.ac = t.ac;
    state.b = t.b;
    state.va = [...t.va];
    state.ix = t.ix;
    state.bp = t.bp;
    state.vb = [...t.vb];
    state.zeroFlag = t.zeroFlag;
    state.negativeFlag = t.negativeFlag;
}

function switchThread(state) {
    let nextId = (state.currentThreadId + 1) % 4;
    let found = false;
    for(let i = 0; i < 4; i++) {
        if(state.threads[nextId].active) {
            found = true;
            break;
        }
        nextId = (nextId + 1) % 4;
    }
    if(found) {
        state.currentThreadId = nextId;
        return true;
    }
    return false;
}

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
        
        case 'HLT': {
            state.threads[state.currentThreadId].active = false;
            saveContext(state);
            logMessage('threadHalted', state, ui, state.currentThreadId);
            if(switchThread(state)) {
                restoreContext(state);
                overrideFlags = true; // Impede que o UI reavalie a flag incorretamente
                updateTidUI(state.currentThreadId, ui.tidValue);
                return 'CONTINUE';
            } else {
                logMessage('halted', state, ui);
                return 'HALT';
            }
        }

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

        // -- NOVAS INSTRUÇÕES DE CONCORRÊNCIA --
        case 'SPAWN': {
            let spawned = false;
            for(let i = 1; i < 4; i++) {
                if(!state.threads[i].active) {
                    state.threads[i].active = true;
                    state.threads[i].pc = arg;
                    state.threads[i].ac = 0;
                    state.threads[i].b = 0;
                    state.threads[i].va = new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0);
                    state.threads[i].ix = 0;
                    state.threads[i].bp = 0;
                    state.threads[i].vb = new Array(CONSTANTS.VECTOR_REG_SIZE).fill(0);
                    state.threads[i].zeroFlag = true;
                    state.threads[i].negativeFlag = false;
                    
                    state.ac = i; // Retorna o ID da thread gerada no AC
                    spawned = true;
                    break;
                }
            }
            if(!spawned) state.ac = 255; // Limite atingido (-1)
            state.pc += 2;
            break;
        }
        
        case 'JOIN': {
            const targetId = accessDCache(arg, state, ui, memorySize);
            if(targetId >= 0 && targetId < 4 && state.threads[targetId].active && targetId !== state.currentThreadId) {
                // Bloqueia e faz YIELD invisivelmente
                saveContext(state);
                switchThread(state);
                restoreContext(state);
                overrideFlags = true;
            } else {
                state.pc += 2; // Target terminou, avança
            }
            break;
        }

        case 'YIELD': {
            state.pc++;
            saveContext(state);
            switchThread(state);
            restoreContext(state);
            overrideFlags = true;
            break;
        }

        case 'TID': {
            state.ac = state.currentThreadId;
            state.pc++;
            break;
        }

        case 'COREID': {
            state.ac = state.coreId; // Preparado para simulação multicore futura
            state.pc++;
            break;
        }

        case 'SWAP': {
            const memVal = accessDCache(arg, state, ui, memorySize);
            accessDCache(arg, state, ui, memorySize, state.ac);
            state.opcodeMap[arg] = null;
            state.ac = memVal;
            state.pc += 2;
            break;
        }

        // Vetoriais
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
    
    updateTidUI(state.currentThreadId, ui.tidValue);
    
    return 'CONTINUE';
}

export function resetState(state, ui, iCacheSize, dCacheSize, vectorRegSize) {
    state.currentThreadId = 0;
    state.coreId = 0;
    state.threads = [
        { active: true, pc: 0, ac: 0, b: 0, va: new Array(vectorRegSize).fill(0), ix: 0, bp: 0, vb: new Array(vectorRegSize).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(vectorRegSize).fill(0), ix: 0, bp: 0, vb: new Array(vectorRegSize).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(vectorRegSize).fill(0), ix: 0, bp: 0, vb: new Array(vectorRegSize).fill(0), zeroFlag: true, negativeFlag: false },
        { active: false, pc: 0, ac: 0, b: 0, va: new Array(vectorRegSize).fill(0), ix: 0, bp: 0, vb: new Array(vectorRegSize).fill(0), zeroFlag: true, negativeFlag: false }
    ];

    state.ac = 0;
    state.b = 0;
    state.pc = 0;
    state.va = new Array(vectorRegSize).fill(0);
    state.ix = 0;
    state.bp = 0;
    state.vb = new Array(vectorRegSize).fill(0);
    state.zeroFlag = true;
    state.negativeFlag = false;
    
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
    
    updateTidUI(state.currentThreadId, ui.tidValue);
}

function updateBaseUI(displayBase, baseDisplay) {
    baseDisplay.textContent = displayBase === 10 ? 'DEC' : 'HEX';
}