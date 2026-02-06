// Main module script for Foundry VTT

class DDBImporter {
  static async ensureCustomCompendium() {
    const existingId = game.settings.get("nevelish-ddb-importer", "customCompendiumId");
    
    // Check if compendium exists
    if (existingId && game.packs.get(existingId)) {
      console.log("DDB Importer | Custom compendium found");
      return game.packs.get(existingId);
    }
    
    // Create new compendium
    try {
      const pack = await CompendiumCollection.createCompendium({
        name: "ddb-imported-content",
        label: "D&D Beyond Imports",
        type: "Item",
        package: "world"
      });
      
      await game.settings.set("nevelish-ddb-importer", "customCompendiumId", pack.collection);
      console.log("DDB Importer | Created custom compendium");
      ui.notifications.info("Created D&D Beyond Imports compendium");
      
      return pack;
    } catch (error) {
      console.error("DDB Importer | Failed to create compendium:", error);
      return null;
    }
  }
  
  static async getCustomCompendium() {
    const compendiumId = game.settings.get("nevelish-ddb-importer", "customCompendiumId");
    return game.packs.get(compendiumId);
  }
}

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

    // Store D&D Beyond URL and character ID in actor flags
    const ddbFlags = {
      "nevelish-ddb-importer.characterUrl": ddbData.characterUrl,
      "nevelish-ddb-importer.characterId": ddbData.characterId,
      "nevelish-ddb-importer.lastSync": new Date().toISOString()
    };

    if (actor) {
      // Update existing - CLEAR existing items to prevent double bonuses
      await actor.deleteEmbeddedDocuments("Item", actor.items.map(i => i.id));
    } else {
      // Create new actor
      actor = await Actor.create({
        name: characterName,
        type: "character",
        flags: ddbFlags
      });
    }

    // Import classes and race first (these affect level calculation)
    await this._importClasses(actor, ddbData.data);
    await this._importRace(actor, ddbData.data);
    
    // Now update actor data with calculated values
    const actorData = this._convertDDBToFoundry(ddbData);
    await actor.update({
      ...actorData,
      flags: { ...actor.flags, ...ddbFlags }
    });
    
    // Import items, spells, and features
    await this._importItems(actor, ddbData.data);
    await this._importSpells(actor, ddbData.data);
    await this._importFeatures(actor, ddbData.data);

    ui.notifications.info(`${actor.isOwner ? 'Updated' : 'Created'} character: ${actor.name}`);
    return actor;
  }

  async _importClasses(actor, ddbData) {
    const classes = ddbData.classes || [];
    const classItems = [];

    for (const cls of classes) {
      if (!cls.definition) continue;

      // Try to find class in compendium
      const compendiumClass = await this._findInCompendium(cls.definition.name, "class");
      
      if (compendiumClass) {
        const classData = compendiumClass.toObject();
        classData.system.levels = cls.level || 1;
        
        // Add subclass if exists
        if (cls.subclassDefinition) {
          classData.system.subclass = cls.subclassDefinition.name || "";
        }
        
        classItems.push(classData);
      } else {
        // Fallback manual creation
        classItems.push({
          name: cls.definition.name,
          type: "class",
          img: cls.definition.portraitAvatarUrl || "icons/svg/book.svg",
          system: {
            description: {
              value: cls.definition.description || ""
            },
            levels: cls.level || 1,
            hitDice: `d${cls.definition.hitDice || 8}`,
            hitDiceUsed: 0,
            subclass: cls.subclassDefinition?.name || ""
          }
        });
      }
    }

    if (classItems.length > 0) {
      await actor.createEmbeddedDocuments("Item", classItems);
      ui.notifications.info(`Imported ${classItems.length} class(es)`);
    }
  }

  async _importRace(actor, ddbData) {
    const race = ddbData.race;
    if (!race || !race.fullName) return;

    // Try to find race in compendium
    const compendiumRace = await this._findInCompendium(race.baseRaceName || race.fullName, "race");
    
    const raceData = compendiumRace ? compendiumRace.toObject() : {
      name: race.fullName,
      type: "race",
      img: race.portraitAvatarUrl || "icons/svg/mystery-man.svg",
      system: {
        description: {
          value: race.description || ""
        }
      }
    };

    await actor.createEmbeddedDocuments("Item", [raceData]);
    ui.notifications.info(`Imported race: ${race.fullName}`);
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
    const totalLevel = classes.reduce((sum, c) => sum + (c.level || 0), 0);

    // Extract race info
    const race = data.race || {};
    const raceTraits = [];
    if (race.racialTraits) {
      race.racialTraits.forEach(trait => {
        raceTraits.push(trait.definition?.name || trait.name);
      });
    }

    // Extract proficiencies
    const proficiencies = data.modifiers?.race || [];
    const languages = [];
    const proficiencyList = [];
    
    proficiencies.forEach(mod => {
      if (mod.subType === 'language') {
        languages.push(mod.friendlySubtypeName);
      } else if (mod.type === 'proficiency') {
        proficiencyList.push(mod.friendlySubtypeName);
      }
    });

    // Extract skills
    const skills = {};
    const skillIds = {
      3: 'acr', 4: 'ani', 12: 'arc', 2: 'ath', 16: 'dec',
      6: 'his', 13: 'ins', 17: 'itm', 5: 'inv', 14: 'med',
      8: 'nat', 9: 'prc', 18: 'prf', 15: 'per', 7: 'rel',
      11: 'slt', 10: 'ste', 1: 'sur'
    };

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
          movement: {
            walk: data.speed?.walk || race.weightSpeeds?.normal?.walk || 30,
            fly: data.speed?.fly || 0,
            swim: data.speed?.swim || 0,
            climb: data.speed?.climb || 0,
            burrow: data.speed?.burrow || 0,
            units: "ft",
            hover: false
          },
          prof: this._calculateProfBonus(totalLevel),
          spellcasting: this._getPrimaryCastingStat(classes)
        },
        details: {
          race: race.fullName || race.baseRaceName || "",
          background: data.background?.definition?.name || "",
          alignment: data.alignmentId ? this._getAlignment(data.alignmentId) : "",
          level: totalLevel,
          xp: {
            value: data.currentXp || 0
          }
        },
        traits: {
          size: race.size || race.sizeId ? this._getSize(race.sizeId) : "med",
          di: { value: this._extractResistances(data, 'immunity') },
          dr: { value: this._extractResistances(data, 'resistance') },
          dv: { value: this._extractResistances(data, 'vulnerability') },
          ci: { value: [] },
          languages: { value: languages }
        },
        currency: {
          cp: data.currencies?.cp || 0,
          sp: data.currencies?.sp || 0,
          ep: data.currencies?.ep || 0,
          gp: data.currencies?.gp || 0,
          pp: data.currencies?.pp || 0
        },
        spells: this._getSpellSlots(classes, totalLevel),
        bonuses: {}
      }
    };
  }

  _getSpecialSpeeds(speed) {
    if (!speed) return "";
    const speeds = [];
    if (speed.fly) speeds.push(`fly ${speed.fly} ft.`);
    if (speed.swim) speeds.push(`swim ${speed.swim} ft.`);
    if (speed.climb) speeds.push(`climb ${speed.climb} ft.`);
    if (speed.burrow) speeds.push(`burrow ${speed.burrow} ft.`);
    return speeds.join(", ");
  }

  _getSpecialSpeeds(speed) {
    if (!speed) return "";
    const speeds = [];
    if (speed.fly) speeds.push(`fly ${speed.fly} ft.`);
    if (speed.swim) speeds.push(`swim ${speed.swim} ft.`);
    if (speed.climb) speeds.push(`climb ${speed.climb} ft.`);
    if (speed.burrow) speeds.push(`burrow ${speed.burrow} ft.`);
    return speeds.join(", ");
  }

  _getPrimaryCastingStat(classes) {
    const casterClass = classes.find(c => c.definition?.spellCastingAbilityId);
    if (!casterClass) return "int";
    
    const abilityMap = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
    return abilityMap[casterClass.definition.spellCastingAbilityId] || "int";
  }

  _getSize(sizeId) {
    const sizes = { 2: "tiny", 3: "sm", 4: "med", 5: "lg", 6: "huge", 7: "grg" };
    return sizes[sizeId] || "med";
  }

  _extractResistances(data, type) {
    const resistances = [];
    const modifiers = data.modifiers?.race || [];
    
    modifiers.forEach(mod => {
      if (mod.type === type && mod.friendlySubtypeName) {
        resistances.push(mod.friendlySubtypeName.toLowerCase());
      }
    });
    
    return resistances;
  }

  _getSpellSlots(classes, level) {
    // Simplified spell slot calculation - would need more logic for multiclassing
    const casterClass = classes.find(c => c.definition?.canCastSpells);
    if (!casterClass) return {};

    const spellSlots = {
      spell1: { value: 0, max: 0 },
      spell2: { value: 0, max: 0 },
      spell3: { value: 0, max: 0 },
      spell4: { value: 0, max: 0 },
      spell5: { value: 0, max: 0 },
      spell6: { value: 0, max: 0 },
      spell7: { value: 0, max: 0 },
      spell8: { value: 0, max: 0 },
      spell9: { value: 0, max: 0 }
    };

    // Basic spell slot progression (full caster)
    const slots = this._getFullCasterSlots(casterClass.level);
    Object.keys(slots).forEach(level => {
      spellSlots[`spell${level}`] = { value: slots[level], max: slots[level] };
    });

    return spellSlots;
  }

  _getFullCasterSlots(level) {
    const progression = {
      1: { 1: 2 },
      2: { 1: 3 },
      3: { 1: 4, 2: 2 },
      4: { 1: 4, 2: 3 },
      5: { 1: 4, 2: 3, 3: 2 },
      6: { 1: 4, 2: 3, 3: 3 },
      7: { 1: 4, 2: 3, 3: 3, 4: 1 },
      8: { 1: 4, 2: 3, 3: 3, 4: 2 },
      9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
      11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
      12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
      13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
      14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
      15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
      16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
      17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
      18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
      19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
      20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }
    };
    return progression[level] || {};
  }

  async _importItems(actor, ddbData) {
    const items = [];
    const inventory = ddbData.inventory || [];

    for (const item of inventory) {
      if (!item.definition) continue;

      // Try to find item in compendium first
      const compendiumItem = await this._findInCompendium(item.definition.name, "item");
      
      if (compendiumItem) {
        // Use compendium item but update quantity and equipped status
        const itemData = compendiumItem.toObject();
        itemData.system.quantity = item.quantity || 1;
        itemData.system.equipped = item.equipped || false;
        if (item.isAttuned) itemData.system.attunement = 2; // Attuned
        items.push(itemData);
      } else {
        // Create from D&D Beyond data
        const itemData = {
          name: item.definition.name,
          type: this._getItemType(item.definition),
          img: item.definition.avatarUrl || "icons/svg/item-bag.svg",
          system: {
            description: {
              value: item.definition.description || ""
            },
            quantity: item.quantity || 1,
            weight: item.definition.weight || 0,
            price: {
              value: item.definition.cost || 0,
              denomination: "gp"
            },
            equipped: item.equipped || false,
            identified: true,
            rarity: this._getRarity(item.definition.rarity),
            attunement: item.definition.requiresAttunement ? 1 : 0
          }
        };

        // Add weapon/armor specific properties
        if (item.definition.damage) {
          itemData.system.damage = {
            parts: [[item.definition.damage.diceString, item.definition.damageType || ""]],
            versatile: ""
          };
          itemData.system.actionType = "mwak";
          itemData.system.properties = this._getWeaponProperties(item.definition);
        }

        if (item.definition.armorClass !== undefined) {
          itemData.system.armor = {
            value: item.definition.armorClass,
            type: this._getArmorType(item.definition.type)
          };
        }

        // Save to custom compendium for future use
        await this._saveToCustomCompendium(itemData);
        
        items.push(itemData);
      }
    }

    if (items.length > 0) {
      await actor.createEmbeddedDocuments("Item", items);
      ui.notifications.info(`Imported ${items.length} items`);
    }
  }

  async _importSpells(actor, ddbData) {
    const spells = [];
    const classSpells = ddbData.classSpells || [];

    for (const spellList of classSpells) {
      for (const spell of spellList.spells || []) {
        if (!spell.definition) continue;

        // Try to find spell in compendium first
        const compendiumSpell = await this._findInCompendium(spell.definition.name, "spell");
        
        if (compendiumSpell) {
          // Use compendium spell but update preparation status
          const spellData = compendiumSpell.toObject();
          spellData.system.preparation = {
            mode: spell.alwaysPrepared ? "always" : "prepared",
            prepared: spell.prepared || false
          };
          spells.push(spellData);
        } else {
          // Create from D&D Beyond data
          const spellData = {
            name: spell.definition.name,
            type: "spell",
            img: "icons/svg/book.svg",
            system: {
              description: {
                value: spell.definition.description || ""
              },
              level: spell.definition.level || 0,
              school: this._getSpellSchool(spell.definition.school),
              components: {
                vocal: spell.definition.components?.includes(1) || false,
                somatic: spell.definition.components?.includes(2) || false,
                material: spell.definition.components?.includes(3) || false,
                ritual: spell.definition.ritual || false,
                concentration: spell.definition.concentration || false
              },
              materials: {
                value: spell.definition.componentsDescription || ""
              },
              preparation: {
                mode: spell.alwaysPrepared ? "always" : "prepared",
                prepared: spell.prepared || false
              },
              actionType: this._getSpellActionType(spell.definition),
              damage: this._getSpellDamage(spell.definition),
              save: this._getSpellSave(spell.definition),
              duration: {
                value: spell.definition.duration?.durationInterval || null,
                units: this._getDurationUnit(spell.definition.duration?.durationUnit)
              },
              range: {
                value: spell.definition.range?.rangeValue || null,
                units: this._getRangeUnit(spell.definition.range?.origin)
              },
              target: {
                value: spell.definition.range?.aoeValue || null,
                type: this._getAreaOfEffect(spell.definition.range?.aoeType)
              }
            }
          };

          // Save to custom compendium for future use
          await this._saveToCustomCompendium(spellData);
          
          spells.push(spellData);
        }
      }
    }

    if (spells.length > 0) {
      await actor.createEmbeddedDocuments("Item", spells);
      ui.notifications.info(`Imported ${spells.length} spells`);
    }
  }

  async _importFeatures(actor, ddbData) {
    const features = [];
    
    // Class features
    const classes = ddbData.classes || [];
    for (const cls of classes) {
      for (const feature of cls.classFeatures || []) {
        if (!feature.definition) continue;

        // Try to find feature in compendium
        const compendiumFeature = await this._findInCompendium(feature.definition.name, "feat");
        
        if (compendiumFeature) {
          features.push(compendiumFeature.toObject());
        } else {
          const featureData = {
            name: feature.definition.name,
            type: "feat",
            img: "icons/svg/aura.svg",
            system: {
              description: {
                value: feature.definition.description || ""
              },
              activation: {
                type: this._getActivationType(feature.definition.activation),
                cost: feature.definition.activation?.activationTime || null
              },
              uses: this._getFeatureUses(feature.definition.limitedUse),
              requirements: cls.definition?.name || "",
              type: {
                value: "class"
              }
            }
          };
          
          // Save to custom compendium
          await this._saveToCustomCompendium(featureData);
          features.push(featureData);
        }
      }
    }

    // Race features
    const race = ddbData.race || {};
    for (const trait of race.racialTraits || []) {
      if (!trait.definition) continue;

      const compendiumTrait = await this._findInCompendium(trait.definition.name, "feat");
      
      if (compendiumTrait) {
        features.push(compendiumTrait.toObject());
      } else {
        const traitData = {
          name: trait.definition.name,
          type: "feat",
          img: "icons/svg/pawprint.svg",
          system: {
            description: {
              value: trait.definition.description || ""
            },
            requirements: race.fullName || "",
            type: {
              value: "race"
            }
          }
        };
        
        // Save to custom compendium
        await this._saveToCustomCompendium(traitData);
        features.push(traitData);
      }
    }

    // Feats
    const feats = ddbData.feats || [];
    for (const feat of feats) {
      if (!feat.definition) continue;

      const compendiumFeat = await this._findInCompendium(feat.definition.name, "feat");
      
      if (compendiumFeat) {
        features.push(compendiumFeat.toObject());
      } else {
        const featData = {
          name: feat.definition.name,
          type: "feat",
          img: "icons/svg/upgrade.svg",
          system: {
            description: {
              value: feat.definition.description || ""
            },
            type: {
              value: "feat"
            }
          }
        };
        
        // Save to custom compendium
        await this._saveToCustomCompendium(featData);
        features.push(featData);
      }
    }

    if (features.length > 0) {
      await actor.createEmbeddedDocuments("Item", features);
      ui.notifications.info(`Imported ${features.length} features and traits`);
    }
  }

  async _findInCompendium(itemName, itemType) {
    // Search custom compendium first
    const customPack = await DDBImporter.getCustomCompendium();
    if (customPack) {
      const customIndex = await customPack.getIndex();
      const customEntry = customIndex.find(i => 
        i.name.toLowerCase() === itemName.toLowerCase() &&
        (itemType === "feat" || i.type === this._getFoundryItemType(itemType))
      );
      
      if (customEntry) {
        console.log(`Found ${itemName} in custom compendium`);
        return await customPack.getDocument(customEntry._id);
      }
    }
    
    // Search through standard compendiums
    const compendiumMap = {
      "spell": ["dnd5e.spells"],
      "item": ["dnd5e.items", "dnd5e.tradegoods"],
      "feat": ["dnd5e.classfeatures", "dnd5e.races", "dnd5e.feats"],
      "class": ["dnd5e.classes"],
      "race": ["dnd5e.races"]
    };

    const packs = compendiumMap[itemType] || [];
    
    for (const packName of packs) {
      const pack = game.packs.get(packName);
      if (!pack) continue;

      const index = await pack.getIndex();
      const entry = index.find(i => 
        i.name.toLowerCase() === itemName.toLowerCase()
      );

      if (entry) {
        console.log(`Found ${itemName} in ${packName}`);
        return await pack.getDocument(entry._id);
      }
    }

    return null;
  }
  
  _getFoundryItemType(ddbType) {
    const typeMap = {
      "spell": "spell",
      "item": "equipment",
      "feat": "feat",
      "class": "class",
      "race": "race"
    };
    return typeMap[ddbType] || ddbType;
  }
  
  async _saveToCustomCompendium(itemData) {
    const customPack = await DDBImporter.getCustomCompendium();
    if (!customPack) {
      console.warn("Custom compendium not available");
      return null;
    }
    
    try {
      // Check if item already exists
      const index = await customPack.getIndex();
      const existing = index.find(i => i.name.toLowerCase() === itemData.name.toLowerCase());
      
      if (existing) {
        console.log(`${itemData.name} already in custom compendium`);
        return await customPack.getDocument(existing._id);
      }
      
      // Create new item in compendium
      const items = await Item.create(itemData, { temporary: true });
      const imported = await customPack.importDocument(items);
      console.log(`Saved ${itemData.name} to custom compendium`);
      
      return imported;
    } catch (error) {
      console.error("Failed to save to custom compendium:", error);
      return null;
    }
  }

  _getItemType(definition) {
    const filterType = definition.filterType?.toLowerCase() || "";
    if (filterType.includes("weapon")) return "weapon";
    if (filterType.includes("armor")) return "equipment";
    if (filterType.includes("potion")) return "consumable";
    if (filterType.includes("scroll")) return "consumable";
    if (filterType.includes("wondrous")) return "loot";
    return "loot";
  }

  _getRarity(rarity) {
    const rarities = {
      1: "common",
      2: "uncommon", 
      3: "rare",
      4: "veryRare",
      5: "legendary",
      6: "artifact"
    };
    return rarities[rarity] || "common";
  }

  _getWeaponProperties(definition) {
    const props = {};
    const properties = definition.properties || [];
    
    properties.forEach(prop => {
      const name = prop.name?.toLowerCase();
      if (name === "finesse") props.fin = true;
      if (name === "versatile") props.ver = true;
      if (name === "light") props.lgt = true;
      if (name === "heavy") props.hvy = true;
      if (name === "reach") props.rch = true;
      if (name === "thrown") props.thr = true;
      if (name === "two-handed") props.two = true;
      if (name === "ammunition") props.amm = true;
      if (name === "loading") props.lod = true;
    });
    
    return props;
  }

  _getArmorType(type) {
    const types = {
      "Light Armor": "light",
      "Medium Armor": "medium",
      "Heavy Armor": "heavy",
      "Shield": "shield"
    };
    return types[type] || "light";
  }

  _getSpellSchool(school) {
    const schools = {
      "Abjuration": "abj",
      "Conjuration": "con",
      "Divination": "div",
      "Enchantment": "enc",
      "Evocation": "evo",
      "Illusion": "ill",
      "Necromancy": "nec",
      "Transmutation": "trs"
    };
    return schools[school] || "evo";
  }

  _getSpellActionType(definition) {
    if (definition.attackType === 1) return "msak"; // Melee spell attack
    if (definition.attackType === 2) return "rsak"; // Ranged spell attack
    if (definition.saveDcAbilityId) return "save";
    return "util";
  }

  _getSpellDamage(definition) {
    if (!definition.damage) return { parts: [] };
    return {
      parts: [[definition.damage.diceString || "", definition.damageType || ""]]
    };
  }

  _getSpellSave(definition) {
    if (!definition.saveDcAbilityId) return { ability: "", dc: null };
    const abilityMap = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
    return {
      ability: abilityMap[definition.saveDcAbilityId] || "dex",
      dc: null,
      scaling: "spell"
    };
  }

  _getDurationUnit(unit) {
    const units = {
      "Minute": "minute",
      "Hour": "hour",
      "Day": "day",
      "Round": "round",
      "Turn": "turn"
    };
    return units[unit] || "inst";
  }

  _getRangeUnit(origin) {
    if (origin === "Self") return "self";
    if (origin === "Touch") return "touch";
    return "ft";
  }

  _getAreaOfEffect(aoeType) {
    const types = {
      1: "sphere",
      2: "cube",
      3: "cone",
      4: "line",
      5: "cylinder"
    };
    return types[aoeType] || "";
  }

  _getActivationType(activation) {
    if (!activation) return "";
    const type = activation.activationType;
    if (type === 1) return "action";
    if (type === 2) return "bonus";
    if (type === 3) return "reaction";
    if (type === 4) return "minute";
    if (type === 6) return "hour";
    return "";
  }

  _getFeatureUses(limitedUse) {
    if (!limitedUse) return { value: null, max: null, per: null };
    
    const perMap = {
      1: "sr", // Short rest
      2: "lr", // Long rest
      3: "day"
    };
    
    return {
      value: limitedUse.maxUses || null,
      max: limitedUse.maxUses || null,
      per: perMap[limitedUse.resetType] || null
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
  
  game.settings.register("nevelish-ddb-importer", "customCompendiumId", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.once("ready", async () => {
  // Ensure custom compendium exists
  await DDBImporter.ensureCustomCompendium();
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
