import fs from 'node:fs';

const file = 'settings-gentle-fixes.js';
let source = fs.readFileSync(file, 'utf8');

const oldBlock = `  function placeSettingsBesideCheck() {
    const tabs = document.querySelector('.ribbon-tabs');
    const check = tabs?.querySelector('.ribbon-tab[data-tab="review"]');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !check || !settings) return false;

    settings.classList.add('settings-ribbon-button');
    if (check.nextElementSibling !== settings) check.insertAdjacentElement('afterend', settings);
    return true;
  }`;

const newBlock = `  function placeSettingsBeforeProjects() {
    const tabs = document.querySelector('.ribbon-tabs');
    const projects = tabs?.querySelector('.ribbon-tab[data-tab="projects"]');
    const settings = document.getElementById('settingsRibbonButton');
    if (!tabs || !settings) return false;

    settings.classList.add('settings-ribbon-button');
    const target = projects || [...tabs.children].find(child => child !== settings) || null;
    if (target && settings.nextElementSibling !== target) tabs.insertBefore(settings, target);
    else if (!target && tabs.firstElementChild !== settings) tabs.prepend(settings);
    return true;
  }`;

if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);
else if (!source.includes('function placeSettingsBeforeProjects()')) {
  throw new Error('Could not find the Settings placement function to update.');
}

source = source.replaceAll('placeSettingsBesideCheck', 'placeSettingsBeforeProjects');
source = source.replaceAll('__figureLoomSettingsGentleFixV3', '__figureLoomSettingsGentleFixV4');
fs.writeFileSync(file, source, 'utf8');
console.log('Updated Settings placement to remain before Projects.');
