import {getPartyMembers, MODULE_NAME} from "../utils";

export async function showAwardPopup(selectedPlayers: string[] | null = null, description: string = '', amount: number = 0, locked = false) {
    if (!game.user.isGM) {
        return;
    }

    const pcs = getPartyMembers();

    // 2. Build the HTMLs
    const playerCheckboxes = pcs.map(pc => `
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="selectedPlayers" value="${pc.id}" ${selectedPlayers ? (selectedPlayers.includes(pc.id) ? 'checked' : '') : 'checked'}>
                <img src="${pc.img}" width="24" height="24" style="border:none">
                ${pc.name}
            </label>
        </div>
    `).join("");

    const content = `
    <form>
        <div class="form-group">
            <label>Reason</label>
            <select name="reason" ${locked ? 'readonly' : ''}>
                <option value="Custom" data-xp="0">Custom Description</option>
                <option value="Encounter (Trivial)" data-xp="40">Encounter (Trivial) 40 exp</option>
                <option value="Encounter (Low)" data-xp="60">Encounter (Low) 60 exp</option>
                <option value="Encounter (Moderate)" data-xp="80">Encounter (Moderate) 80 exp</option>
                <option value="Encounter (Severe)" data-xp="120">Encounter (Severe) 120 exp</option>
                <option value="Encounter (Extreme)" data-xp="160">Encounter (Extreme) 160 exp</option>
                <option value="Accomplishment (Minor)" data-xp="10">Accomplishment (Minor) 10 exp</option>
                <option value="Accomplishment (Moderate)" data-xp="30">Accomplishment (Moderate) 30 exp</option>
                <option value="Accomplishment (Major)" data-xp="80">Accomplishment (Major) 80 exp</option>
            </select>
        </div>
        <div class="form-group">
            <label>XP Amount</label>
            <input type="number" name="amount" value="${amount}" min="1">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="description" placeholder="Optional notes..." ${locked ? 'readonly' : ''}>${description}</textarea>
        </div>
        <hr>
        <label><strong>Target Players</strong></label>
        <div class="player-list" style="margin-top: 10px; max-height: 150px; overflow-y: auto;">
            ${playerCheckboxes}
        </div>
    </form>`;

    // @ts-ignore
    const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: "Award XP to players" },
        content: content,
        ok: {
            label: "Confirm",
            callback: (event: PointerEvent | SubmitEvent, button: HTMLButtonElement) => {
                const fd = new foundry.applications.ux.FormDataExtended(button.form).object;

                if (!fd.selectedPlayers) {
                    fd.selectedPlayers = [];
                }

                if (typeof fd.selectedPlayers === "string") {
                    fd.selectedPlayers = [fd.selectedPlayers]
                }

                fd.selectedPlayers = fd.selectedPlayers.filter(item => !!item);

                return fd;
            }
        },
        rejectClose: false,
        render: (event: Event, dialog) => {
            const reasonSelect = dialog.element.querySelector('select[name="reason"]');
            const amountInput = dialog.element.querySelector('input[name="amount"]');
            const descriptionTextarea = dialog.element.querySelector('textarea[name="description"]');

            reasonSelect?.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                const xpValue = selectedOption.getAttribute('data-xp');
                const reasonValue = selectedOption.value;

                if (amountInput) {
                    amountInput.value = xpValue;
                }

                if (descriptionTextarea) {
                    if (reasonValue === 'Custom') {
                        descriptionTextarea.value = '';
                        descriptionTextarea.readonly = false;
                    } else {
                        descriptionTextarea.value = reasonValue;
                        descriptionTextarea.readonly = true;
                    }
                }
            });
        }
    });

    if (result) {
        if (isNaN(result.amount)) {
            ui.notifications.error("The amount must be a valid number.");

            return;
        }

        const actors = result.selectedPlayers.map(playerId => game.actors.get(playerId));
        const amount = parseInt(result.amount);

        for (const actor of actors) {
            try {
                await actor.update({'system.details.xp.value': parseInt(actor.system.details.xp.value) + amount})
            } catch (error) {
                ui.notifications.warn(actor.name + ": " + error.message);
            }
        }

        const context = {
            message: game.i18n.format("PF2EXP.ChatMessage",
                {name: game.actors.party.name, award: amount, description: result.description }),
            actors: actors,
        }

        const content = await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_NAME}/templates/chat.hbs`, context);

        const messageData = {
            content: content,
            speaker: ChatMessage.getSpeaker(),
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        }

        return ChatMessage.create(messageData);
    }
}
