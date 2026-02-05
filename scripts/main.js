// Main module script for Foundry VTT

class DDBImporterDialog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "ddb-importer",
      title: "Import from D&D Beyond",
      template: "modules/ddb-importer/templates/import-dialog.html",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false
    });
  }

  getData() {
    return {
      pasteData: this.pasteData || ""
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
    
    // Check if character already exists
    let actor = game.actors.find(a => 
      a.name === characterName && 
      a.type === "character"
    );

    const actorData = this._convertDDBToFoundry(ddbData);

    if (actor) {
      // Update existing
      await actor.update(actorData);
      ui.notifications.info(`Updated existing character: ${characterName}`);
    } else {
      // Create new
      actor = await Actor.create({
        name: characterName,
        type: "character",
        ...actorData
      });
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
  console.log("D&D Beyond Importer | Initializing");
  
  game.settings.register("ddb-importer", "lastImport", {
    scope: "client",
    config: false,
    type: String,
    default: ""
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
  const importBtn = $(`
    <button class="ddb-import-button">
      <i class="fas fa-file-import"></i> Import from D&D Beyond
    </button>
  `);
  
  html.find(".directory-header .action-buttons").append(importBtn);
  
  importBtn.click(() => {
    new DDBImporterDialog().render(true);
  });
});
