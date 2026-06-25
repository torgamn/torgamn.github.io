import { logMessage } from './language.js';

export function accessCache(address, cache, cacheSize, logPrefix, state, ui, memory, memorySize) {
    const blockOffset = address % cacheSize;
    const blockStartAddr = address - blockOffset;
    const tag = blockStartAddr;

    if (cache.valid && cache.tag === tag) {
        cache.hits++;
        logMessage(`${logPrefix}CacheHit`, state, ui, address);
        return cache.data[blockOffset];
    } else {
        cache.misses++;
        logMessage(`${logPrefix}CacheMiss`, state, ui, address);
        for (let i = 0; i < cacheSize; i++) {
            if (blockStartAddr + i < memorySize) {
                cache.data[i] = memory[blockStartAddr + i] || 0;
            }
        }
        cache.tag = tag;
        cache.valid = true;
        return cache.data[blockOffset];
    }
}

export function accessICache(address, state, ui, memorySize) {
    return accessCache(address, state.iCache, state.iCache.data.length, 'i', state, ui, state.memory, memorySize);
}

export function accessDCache(address, state, ui, memorySize, valueToWrite = null) {
    const cache = state.dCache;
    const cacheSize = state.dCache.data.length;
    const blockOffset = address % cacheSize;
    const blockStartAddr = address - blockOffset;
    const tag = blockStartAddr;

    if (valueToWrite !== null) {
        logMessage('dCacheWrite', state, ui, address, valueToWrite);
        state.memory[address] = valueToWrite;
        if (cache.valid && cache.tag === tag) {
            cache.data[blockOffset] = valueToWrite;
        }
        return;
    }
    
    return accessCache(address, cache, cacheSize, 'd', state, ui, state.memory, memorySize);
}
