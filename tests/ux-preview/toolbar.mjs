import './toolbar.css';
import { SKIN_IDS, SKIN_STORAGE_KEY } from '../../src/theme/skins';

const toolbar = document.createElement('aside');
toolbar.className = 'preview-toolbar';
toolbar.setAttribute('aria-label', 'Sample preview appearance');
const label = document.createElement('span');
label.textContent = 'LOCAL PREVIEW · SAMPLE DATA';
toolbar.append(label);
for (const skin of SKIN_IDS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = skin[0].toUpperCase() + skin.slice(1);
  button.dataset.skinChoice = skin;
  button.onclick = () => {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
    // Use the same synchronization as another tab's device preference.
    window.dispatchEvent(new StorageEvent('storage', { key: SKIN_STORAGE_KEY, newValue: skin }));
  };
  toolbar.append(button);
}
document.body.append(toolbar);
const sync = () => toolbar.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.skinChoice === document.documentElement.dataset.skin)));
new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
sync();
