import CHANGELOG from '../changelog.json';

export function renderChangelog(container) {
  if (!container) {
    return;
  }

  container.innerHTML = '';
  CHANGELOG.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'changelog-entry';

    const header = document.createElement('div');
    header.className = 'changelog-header';

    const version = document.createElement('span');
    version.className = 'changelog-version';
    version.textContent = `v${entry.version}`;

    const date = document.createElement('span');
    date.className = 'changelog-date';
    date.textContent = entry.date;

    header.append(version, date);

    const ul = document.createElement('ul');
    ul.className = 'changelog-changes';
    entry.changes.forEach((change) => {
      const li = document.createElement('li');
      li.textContent = change;
      ul.appendChild(li);
    });

    div.append(header, ul);
    container.appendChild(div);
  });
}
