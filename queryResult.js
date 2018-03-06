browser.runtime.sendMessage({}).then(message => {
  let parser = new DOMParser();
  let doc = parser.parseFromString(message, 'text/html');
  document.body.appendChild(doc.firstChild);
}, error => {});