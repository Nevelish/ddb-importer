// Main module script for Foundry VTT

class DDBImporterDialog extends FormApplication {
  constructor(actor = null) {
    super();
    this.targetActor = actor; // Store the actor if opened from character sheet
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "nevelish-ddb-importer",
      title: "Import from D&D Beyond",
      template: "modules/nevelish-ddb-importer/templates/import-dialog.html",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false
    });
  }

  getData() {
    const characterUrl = this.targetActor?.getFlag("nevelish-ddb-importer", "characterUrl");
    const lastSync = this.targetActor?.getFlag("nevelish-ddb-importer", "lastSync");
    
    return {
      pasteData: this.pasteData || "",
      characterUrl: characterUrl || "",
      lastSync: lastSync ? new Date(lastSync).toLocaleString() : "Never",
      hasStoredUrl: !!characterUrl
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("#import-btn").click(this._onImport.bind(this));
    html.find("#paste-area").on("paste", (e) => {
      setTimeout(() => {
        this.pasteData = e.target.value;
      }, 10);
    });
  }

  async _onImport(event) {
    event.preventDefault();
    const textarea = this.element.find("#paste-area");
    const data = textarea.val();
    
    if (!data) {
      ui.notifications.error("Please paste character data from D&D Beyond extension");
      return;
    }

    try {
      const importData = JSON.parse(data);
      
      if (!importData.characterData) {
        ui.notifications.error("Invalid data format. Please use 'Copy Character Data' from the extension.");
        return;
      }

      ui.notifications.info("Importing character...");
      
      const actor = await this._createOrUpdateActor(importData.characterData);
      
      ui.notifications.success(`Character "${actor.name}" imported successfully!`);
      this.close();
      actor.sheet.render(true);
      
    } catch (error) {
      console.error("Import error:", error);
      ui.notifications.error(`Import failed: ${error.message}`);
    }
  }

  async _createOrUpdateActor(ddbData) {
    const characterName = ddbData.data?.name || "Imported Character";
    
    // If opened from a character sheet, update that specific actor
    let actor = this.targetActor;
    
    // Otherwise, check if character already exists
    if (!actor) {
      actor = game.actors.find(a => 
        a.name === characterName && 
        a.type === "character"
      );
    }

    const actorData = this._convertDDBToFoundry(ddbData);

    // Store D&D Beyond URL and character ID in actor flags
    const ddbFlags = {
      "nevelish-ddb-importer.characterUrl": ddbData.characterUrl,
      "nevelish-ddb-importer.characterId": ddbData.characterId,
      "nevelish-ddb-importer.lastSync": new Date().toISOString()
    };

    if (actor) {
      // Update existing
      await actor.update({
        ...actorData,
        flags: { ...actor.flags, ...ddbFlags }
      });
      ui.notifications.info(`Updated character: ${actor.name}`);
    } else {
      // Create new
      actor = await Actor.create({
        name: characterName,
        type: "character",
        ...actorData,
        flags: ddbFlags
      });
      ui.notifications.info(`Created new character: ${characterName}`);
    }

    return actor;
  }

  _convertDDBToFoundry(ddbData) {
    const data = ddbData.data;
    
    // Extract basic stats
    const stats = data.stats || [];
    const abilities = {};
    
    stats.forEach(stat => {
      const abilityMap = {
        1: 'str', 2: 'dex', 3: 'con',
        4: 'int', 5: 'wis', 6: 'cha'
      };
      const key = abilityMap[stat.id];
      if (key) {
        abilities[key] = {
          value: stat.value || 10
        };
      }
    });

    // Extract HP
    const baseHp = data.baseHitPoints || 0;
    const bonusHp = data.bonusHitPoints || 0;
    const currentHp = data.removedHitPoints 
      ? (baseHp + bonusHp - data.removedHitPoints) 
      : (baseHp + bonusHp);

    // Extract classes
    const classes = data.classes || [];
    const classData = {};
    classes.forEach(cls => {
      classData[cls.definition?.name?.toLowerCase() || 'class'] = {
        level: cls.level || 1
      };
    });

    // Build Foundry actor data
    return {
      system: {
        abilities: abilities,
        attributes: {
          hp: {
            value: currentHp,
            max: baseHp + bonusHp,
            temp: data.temporaryHitPoints || 0
          },
          ac: {
            value: data.armorClass || 10
          },
          speed: {
            value: data.speed?.walk || 30
          },
          prof: this._calculateProfBonus(classes[0]?.level || 1)
        },
        details: {
          race: data.race?.fullName || "",
          background: data.background?.definition?.name || "",
          alignment: data.alignmentId ? this._getAlignment(data.alignmentId) : "",
          level: classes.reduce((sum, c) => sum + (c.level || 0), 0)
        },
        traits: {
          size: data.race?.size || "med"
        }
      }
    };
  }

  _calculateProfBonus(level) {
    return Math.ceil(level / 4) + 1;
  }

  _getAlignment(id) {
    const alignments = {
      1: "lg", 2: "ng", 3: "cg",
      4: "ln", 5: "tn", 6: "cn",
      7: "le", 8: "ne", 9: "ce"
    };
    return alignments[id] || "";
  }
}

// Register module
Hooks.once("init", () => {
  console.log("Nevelish D&D Beyond Importer | Initializing");
  
  game.settings.register("nevelish-ddb-importer", "lastImport", {
    scope: "client",
    config: false,
    type: "String",
    default: ""
  });
});

// Add sync button to character sheets (Tidy5e specific)
Hooks.on("renderActorSheet", (sheet, html, data) => {
  // Only add to PC character sheets in dnd5e system
  if (sheet.actor.type !== "character") return;
  
  // Ensure html is a jQuery object
  const $html = html instanceof jQuery ? html : $(html);
  
  const syncBtn = $(`
    <button class="nevelish-ddb-sync-button" title="Sync from D&D Beyond">
      <i class="fas fa-sync-alt"></i> Sync from Beyond
    </button>
  `);
  
  // Check if button already exists
  if ($html.find(".nevelish-ddb-sync-button").length > 0) return;
  
  // For Tidy5e Sheet - add to the utility toolbar
  const utilityToolbar = $html.find(".tidy5e-sheet .utility-toolbar, .tidy5e-sheet .sheet-header .controls");
  if (utilityToolbar.length > 0) {
    utilityToolbar.append(syncBtn);
  } else {
    // Fallback for other sheets - add to window header
    $html.find(".window-header .window-title").after(syncBtn);
  }
  
  syncBtn.click((e) => {
    e.preventDefault();
    new DDBImporterDialog(sheet.actor).render(true);
  });
});

// Add button to actors sidebar
Hooks.on("getActorDirectoryEntryContext", (html, options) => {
  options.push({
    name: "Import from D&D Beyond",
    icon: '<i class="fas fa-file-import"></i>',
    callback: () => {
      new DDBImporterDialog().render(true);
    }
  });
});

// Add button to actor directory header
Hooks.on("renderActorDirectory", (app, html) => {
  // Ensure html is a jQuery object
  const $html = html instanceof jQuery ? html : $(html);
  
  const importBtn = $(`
    <button class="nevelish-ddb-import-button">
      <i class="fas fa-file-import"></i> Import from D&D Beyond
    </button>
  `);
  
  $html.find(".directory-header .action-buttons").append(importBtn);
  
  importBtn.click(() => {
    new DDBImporterDialog().render(true);
  });
});
