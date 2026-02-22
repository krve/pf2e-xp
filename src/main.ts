/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

import {getPartyMembers, MODULE_NAME, registerFoundryHook, unregisterAllFoundryHooks} from "./utils";
import {showAwardPopup} from "./actions/showAwardPopup";

/**
 * Enrichment syntax example:
 *   [[/award 80 {Severe encounter}]]
 *   [[/award 30]]
 *
 * Creates a clickable link in journals/notes/etc.
 */
function registerAwardEnricher() {
    // Avoid double-registration if code re-runs (e.g. during dev/HMR)
    // Foundry doesn't provide a built-in "remove enricher" API, so guard it.
    const flagKey = "__pf2eAwardXpEnricherRegistered";
    if ((globalThis as any)[flagKey]) return;
    (globalThis as any)[flagKey] = true;

    CONFIG.TextEditor.enrichers.push({
        // Matches: [[/award 80 {Some description}]]
        // - amount: digits
        // - optional {description}
        pattern: /\[\[\s*\/award\s+(?<amount>\d+)\s*(?:\{(?<description>[^}]*)\})?\s*]]/gi,

        enricher: async (match: RegExpMatchArray) => {
            const amount = Number(match.groups?.amount ?? 0);
            const description = (match.groups?.description ?? "").trim();

            const a = document.createElement("a");
            a.classList.add("content-link");
            a.dataset.action = "pf2e-xp-award";
            a.dataset.amount = String(amount);
            a.dataset.description = description;

            // What the user sees in the journal text
            const label = description ? `Award ${amount} XP (${description})` : `Award ${amount} XP`;
            a.textContent = label;

            return a;
        },
    });

    // Single delegated click handler for all enriched links
    document.body.addEventListener("click", onAwardEnrichedClick, true);
}

async function onAwardEnrichedClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a[data-action="pf2e-xp-award"]') as HTMLAnchorElement | null;
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();

    if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can award XP.");
        return;
    }

    const amount = Number(link.dataset.amount ?? 0);
    const description = String(link.dataset.description ?? "");

    if (!Number.isFinite(amount) || amount <= 0) {
        ui.notifications.error("Invalid XP amount.");
        return;
    }

    // Reuse your existing popup flow
    await showAwardPopup(null, description, amount, true);
}

function register() {
    unregisterAllFoundryHooks();

    registerFoundryHook('preDeleteCombat', (combat, html, id) => {
        if (!game.user.isGM) {
            return;
        }

        const pcs = combat.combatants.filter(combatant => {
            return combatant.actor.type === 'character'
                && combatant.actor.alliance === 'party'
                && !combatant.actor.traits.has('eidolon')
                && !combatant.actor.traits.has('minion');
        }).map(combatant => combatant.actor)

        const pwol = game.pf2e.settings.variants.pwol.enabled;

        // We expect all combatants to be the same level
        const calulatedXP = game.pf2e.gm.calculateXP(
            pcs[0].system.details.level.value,
            pcs.length,
            combat.combatants.filter(c => c.actor.alliance === 'opposition').map(c => c.actor.system.details.level.value),
            combat.combatants.filter(c => c.actor.type === "hazard").map(c => c.actor.system.details.level.value),
            {pwol}
        );

        const xpToAward = calulatedXP.xpPerPlayer * (pcs.length / getPartyMembers().length);

        showAwardPopup(pcs.map(actor => actor._id), `Encounter (${calulatedXP.rating.charAt(0).toUpperCase()}${calulatedXP.rating.slice(1)})`, xpToAward);
    });

    registerFoundryHook("init", () => {
        // @ts-ignore
        game.modules.get(MODULE_NAME).showPopup = showAwardPopup;

        registerAwardEnricher();
    });
}

/**
 * Undo module side-effects (called before a hot update replaces this module)
 */
function unregister() {
    unregisterAllFoundryHooks();
}

// Initial load
register();

// HMR support: accept updates without full page reload
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unregister();
    });

    import.meta.hot.accept(() => {
        register();

        // Ensure globals are always updated to latest implementation
        if (game) {
            // @ts-ignore
            game.modules.get(MODULE_NAME).showPopup = showAwardPopup;
        }
    });
}

