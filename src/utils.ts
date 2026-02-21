export const MODULE_NAME = 'pf2e-xp';

// Track hook callbacks so we can Hooks.off() them on hot updates
const registeredHookCallbacks: Array<{ hook: any; callback: (...args: any[]) => any }> = [];

export function registerFoundryHook<K extends Hooks.HookName>(hook: K, callback: Hooks.Function<K>) {
    // Prevent duplicates if register() is called again
    Hooks.off(hook, callback);
    Hooks.on(hook, callback);
    registeredHookCallbacks.push({ hook, callback });
}

export function unregisterAllFoundryHooks() {
    for (const { hook, callback } of registeredHookCallbacks) {
        Hooks.off(hook, callback);
    }
    registeredHookCallbacks.length = 0;
}
